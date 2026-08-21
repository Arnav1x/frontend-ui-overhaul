import { WebContentsView, type BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'

import type {
  BrowserSession,
  BrowserSessionStatus,
  BrowserWorkspaceBounds
} from '../browser/browser-session'
import { PlaywrightMcpBrowserSession } from '../browser/playwright-mcp-browser-session'

export interface BrowserWorkspaceOptions {
  cdpEndpoint: string
  initialTargetUrl: string
  onStatusChange: (status: BrowserSessionStatus) => void
  window: BrowserWindow
}

/**
 * Main-process composition for the native browser surface. It is the only
 * product code outside the browser adapter that handles Electron view APIs.
 */
export class BrowserWorkspace {
  private disposed = false
  private readonly targetMarker = `TestGen embedded browser ${randomUUID()}`
  private readonly session: PlaywrightMcpBrowserSession
  private readonly view: WebContentsView

  constructor(private readonly options: BrowserWorkspaceOptions) {
    this.view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    this.session = new PlaywrightMcpBrowserSession({
      cdpEndpoint: options.cdpEndpoint,
      targetMarker: this.targetMarker
    })
    this.session.subscribe(options.onStatusChange)
    options.window.contentView.addChildView(this.view)

    this.view.webContents.on(
      'did-start-navigation',
      (_event, _url, isInPlace, isMainFrame) => {
        if (isMainFrame && !isInPlace) {
          this.session.markNavigating()
        }
      }
    )
    this.view.webContents.on('did-finish-load', () => {
      void this.session.confirmPageReady().catch(() => undefined)
    })
    this.view.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
        if (isMainFrame && errorCode !== -3) {
          this.session.fail(
            new Error(
              `The embedded page could not load ${validatedUrl} (${errorCode}: ${errorDescription}).`
            )
          )
        }
      }
    )
    this.view.webContents.on('render-process-gone', (_event, details) => {
      this.session.fail(
        new Error(`The embedded browser process ended (${details.reason}).`)
      )
    })
  }

  async start(): Promise<void> {
    try {
      // A new WebContentsView does not provide a completed blank document to
      // execute against until it has explicitly loaded one.
      await this.view.webContents.loadURL('about:blank')
      await this.view.webContents.executeJavaScript(
        `document.title = ${JSON.stringify(this.targetMarker)}`
      )
      const targetId = await this.readEmbeddedTargetId()
      console.info(`TestGen embedded CDP target: ${targetId}`)

      await this.session.start()
      if (this.options.initialTargetUrl !== 'about:blank') {
        await this.view.webContents.loadURL(this.options.initialTargetUrl)
      }
    } catch (error) {
      this.session.fail(toError(error))
    }
  }

  getStatus(): BrowserSessionStatus {
    return this.session.getStatus()
  }

  getBrowserSession(): BrowserSession {
    return this.session
  }

  setBounds(bounds: BrowserWorkspaceBounds): void {
    const normalizedBounds = normalizeWorkspaceBounds(bounds)
    if (!normalizedBounds || this.disposed) {
      return
    }

    this.view.setBounds(normalizedBounds)
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return
    }
    this.disposed = true

    await this.session.dispose()
    this.options.window.contentView.removeChildView(this.view)
    if (!this.view.webContents.isDestroyed()) {
      this.view.webContents.close()
    }
  }

  private async readEmbeddedTargetId(): Promise<string> {
    const debugger_ = this.view.webContents.debugger
    debugger_.attach('1.3')
    try {
      const result = (await debugger_.sendCommand('Target.getTargetInfo')) as {
        targetInfo?: { targetId?: string }
      }
      const targetId = result.targetInfo?.targetId
      if (!targetId) {
        throw new Error('Electron did not report an embedded CDP target ID.')
      }
      return targetId
    } finally {
      if (debugger_.isAttached()) {
        debugger_.detach()
      }
    }
  }
}

export function normalizeWorkspaceBounds(
  bounds: BrowserWorkspaceBounds
): BrowserWorkspaceBounds | undefined {
  if (
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width < 0 ||
    bounds.height < 0
  ) {
    return undefined
  }

  return {
    height: Math.round(bounds.height),
    width: Math.round(bounds.width),
    x: Math.round(bounds.x),
    y: Math.round(bounds.y)
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
