import { app, BrowserWindow, ipcMain } from 'electron'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isLiveTestProgressDocument } from '../authoring/live-test-progress'
import { isPlaywrightTestRunMode } from '../authoring/playwright-test-run-result'
import type {
  BrowserSessionStatus,
  BrowserWorkspaceBounds
} from '../browser/browser-session'
import { BrowserWorkspace } from './browser-workspace'
import { AgentTestingConsoleController } from './agent-testing-console-controller'
import { AiAuthoringController } from './ai-authoring-controller'
import { BrowserExecutionAgentRunner } from './browser-execution-agent-runner'
import { BrowserExecutionController } from './browser-execution-controller'
import { loadLocalEnvironment } from './ai-authoring-runtime-config'
import { readAiAuthoringRuntimeConfig } from './ai-authoring-runtime-config'
import { DirectToolController } from './direct-tool-controller'
import { LiveTestProgressController } from './live-test-progress-controller'
import { NcrmsStdLoginController } from './ncrms-std-login-controller'
import { createPlaywrightTestController } from './playwright-test-controller'
import {
  canInvokeAiAuthoring,
  canInvokeAgentTestingConsole,
  canOpenDirectTools,
  canOpenAgentTestingConsole,
  canInvokeDirectTools,
  canReadBrowserStatus,
  closeDirectToolsWindow
} from './window-access'

loadLocalEnvironment()

const mainDirectory = dirname(fileURLToPath(import.meta.url))
const cdpPort = await reserveLoopbackPort()
const cdpEndpoint = `http://127.0.0.1:${cdpPort}`
const directToolsAvailable = Boolean(process.env.ELECTRON_RENDERER_URL)
const agentTestingConsoleAvailable = Boolean(process.env.ELECTRON_RENDERER_URL)

if (app.isReady()) {
  throw new Error('TestGen selected its CDP port after Electron was ready.')
}

app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1')
app.commandLine.appendSwitch('remote-debugging-port', String(cdpPort))

let applicationWindow: BrowserWindow | undefined
let browserWorkspace: BrowserWorkspace | undefined
let directToolsWindow: BrowserWindow | undefined
let agentTestingConsoleWindow: BrowserWindow | undefined
const liveTestProgressController = new LiveTestProgressController()
const playwrightTestController = createPlaywrightTestController()
const browserExecutionController = new BrowserExecutionController({
  getBrowserSession: () => browserWorkspace?.getBrowserSession()
})
const ncrmsStdLoginController = new NcrmsStdLoginController(() =>
  browserWorkspace?.getBrowserSession()
)
const browserExecutionAgentRunner = new BrowserExecutionAgentRunner({
  browserController: browserExecutionController,
  readRuntimeConfig: readAiAuthoringRuntimeConfig,
  onConfirmedStep: (step) => {
    liveTestProgressController.appendCapturedStep(step)
    publishLiveTestProgress()
  },
  onTraceEvent: (event) => {
    if (applicationWindow && !applicationWindow.webContents.isDestroyed()) {
      applicationWindow.webContents.send('ai-authoring:trace-event', event)
    }
  }
})
const aiAuthoringController = new AiAuthoringController({
  agentRunner: browserExecutionAgentRunner
})
const agentTestingConsoleController = new AgentTestingConsoleController({
  aiAuthoringController,
  browserController: browserExecutionController,
  enabled: agentTestingConsoleAvailable
})
const directToolController = new DirectToolController({
  enabled: directToolsAvailable,
  getBrowserSession: () => browserWorkspace?.getBrowserSession()
})

function createApplicationWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    title: 'TestGen',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(mainDirectory, '../preload/index.cjs')
    }
  })
  applicationWindow = window
  startBrowserWorkspace(window)

  loadRendererWindow(window, 'main')

  window.on('closed', () => {
    const consoleWindow = directToolsWindow
    directToolsWindow = undefined
    closeDirectToolsWindow(consoleWindow)
    const agentConsoleWindow = agentTestingConsoleWindow
    agentTestingConsoleWindow = undefined
    closeDirectToolsWindow(agentConsoleWindow)
    const workspace = browserWorkspace
    browserWorkspace = undefined
    applicationWindow = undefined
    if (workspace) {
      void workspace.dispose()
    }
  })

  console.info(`TestGen browser CDP endpoint: ${cdpEndpoint}`)
  return window
}

function startBrowserWorkspace(window: BrowserWindow): void {
  browserWorkspace = new BrowserWorkspace({
    cdpEndpoint,
    initialTargetUrl: process.env.TESTGEN_TARGET_URL ?? 'about:blank',
    onStatusChange: publishBrowserStatus,
    window
  })
  void browserWorkspace.start()
}

function createDirectToolsWindow(parent: BrowserWindow): void {
  if (!directToolsAvailable) {
    return
  }

  const window = new BrowserWindow({
    autoHideMenuBar: true,
    height: 920,
    minHeight: 620,
    minWidth: 440,
    parent,
    title: 'TestGen Direct Step Console',
    width: 560,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(mainDirectory, '../preload/index.cjs')
    }
  })
  directToolsWindow = window
  loadRendererWindow(window, 'direct-tools')
  window.on('closed', () => {
    if (directToolsWindow === window) {
      directToolsWindow = undefined
    }
  })
}

function openDirectToolsWindow(): void {
  const existingWindow = directToolsWindow
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.show()
    existingWindow.focus()
    return
  }

  if (applicationWindow && !applicationWindow.isDestroyed()) {
    createDirectToolsWindow(applicationWindow)
  }
}

function createAgentTestingConsoleWindow(parent: BrowserWindow): void {
  if (!agentTestingConsoleAvailable) {
    return
  }

  const window = new BrowserWindow({
    autoHideMenuBar: true,
    height: 960,
    minHeight: 680,
    minWidth: 720,
    parent,
    title: 'TestGen Agent Testing Console',
    width: 920,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(mainDirectory, '../preload/index.cjs')
    }
  })
  agentTestingConsoleWindow = window
  loadRendererWindow(window, 'agent-testing-console')
  window.on('closed', () => {
    if (agentTestingConsoleWindow === window) {
      agentTestingConsoleWindow = undefined
    }
  })
}

function openAgentTestingConsoleWindow(): void {
  const existingWindow = agentTestingConsoleWindow
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.show()
    existingWindow.focus()
    return
  }

  if (applicationWindow && !applicationWindow.isDestroyed()) {
    createAgentTestingConsoleWindow(applicationWindow)
  }
}

function loadRendererWindow(
  window: BrowserWindow,
  view: 'main' | 'direct-tools' | 'agent-testing-console'
): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    const rendererUrl = new URL(process.env.ELECTRON_RENDERER_URL)
    if (view !== 'main') {
      rendererUrl.searchParams.set('view', view)
    }
    void window.loadURL(rendererUrl.toString())
    return
  }

  void window.loadFile(join(mainDirectory, '../renderer/index.html'), {
    query: view === 'main' ? undefined : { view }
  })
}

function publishBrowserStatus(status: BrowserSessionStatus): void {
  console.info(
    `TestGen browser session: ${status.state}${
      status.detail ? ` (${status.detail})` : ''
    }`
  )
  for (const window of [
    applicationWindow,
    directToolsWindow,
    agentTestingConsoleWindow
  ]) {
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send('browser-session:status', status)
    }
  }
}

function canAccessLiveTestProgress(senderId: number): boolean {
  return senderId === applicationWindow?.webContents.id
}

function publishLiveTestProgress(): void {
  const document = liveTestProgressController.getDocument()
  if (applicationWindow && !applicationWindow.webContents.isDestroyed()) {
    applicationWindow.webContents.send(
      'live-test-progress:document-changed',
      document
    )
  }
}

ipcMain.handle('browser-session:get-status', (event): BrowserSessionStatus => {
  if (
    !canReadBrowserStatus(
      event.sender.id,
      applicationWindow?.webContents.id,
      directToolsWindow?.webContents.id,
      agentTestingConsoleWindow?.webContents.id
    ) ||
    !browserWorkspace
  ) {
    throw new Error('The browser session is unavailable to this renderer.')
  }

  return browserWorkspace.getStatus()
})

ipcMain.handle(
  'application:get-configuration',
  (
    event
  ): {
    agentTestingConsoleAvailable: boolean
    directToolsAvailable: boolean
  } => {
    if (event.sender.id !== applicationWindow?.webContents.id) {
      throw new Error(
        'Application configuration is unavailable to this renderer.'
      )
    }

    return { agentTestingConsoleAvailable, directToolsAvailable }
  }
)

ipcMain.handle('application:open-agent-testing-console', (event): void => {
  if (
    !agentTestingConsoleAvailable ||
    !canOpenAgentTestingConsole(
      event.sender.id,
      applicationWindow?.webContents.id
    )
  ) {
    throw new Error('The Agent Testing Console is unavailable for this launch.')
  }

  openAgentTestingConsoleWindow()
})

ipcMain.handle('application:open-direct-tools', (event): void => {
  if (
    !directToolsAvailable ||
    !canOpenDirectTools(event.sender.id, applicationWindow?.webContents.id)
  ) {
    throw new Error('The Direct Step Console is unavailable for this launch.')
  }

  openDirectToolsWindow()
})

ipcMain.handle('application:open-url', async (event, url: unknown) => {
  if (event.sender.id !== applicationWindow?.webContents.id) {
    throw new Error('URL entry is unavailable to this renderer.')
  }
  const targetUrl = normalizeSetupUrl(url)
  if (!targetUrl) {
    return {
      status: 'rejected',
      message: 'Enter a full http(s) address, such as https://example.com.'
    }
  }
  const result = await browserExecutionController.invoke({
    action: 'navigate',
    url: targetUrl
  })
  if (result.status === 'success') {
    liveTestProgressController.appendCapturedStep({
      stepNumber: 0,
      description: '',
      action: 'navigate',
      selector: { kind: '', value: '', strategy: '' },
      playwrightLocator: '',
      parameter: targetUrl
    })
    publishLiveTestProgress()
  }
  return result
})

ipcMain.handle('application:restart-browser', async (event) => {
  if (event.sender.id !== applicationWindow?.webContents.id) {
    throw new Error('Browser restart is unavailable to this renderer.')
  }
  const window = applicationWindow
  const workspace = browserWorkspace
  browserWorkspace = undefined
  if (workspace) {
    await workspace.dispose().catch(() => undefined)
  }
  if (window && !window.isDestroyed()) {
    startBrowserWorkspace(window)
  }
})

ipcMain.handle('application:restart-session', (event) => {
  if (event.sender.id !== applicationWindow?.webContents.id) {
    throw new Error('Restart Session is unavailable to this renderer.')
  }
  if (!aiAuthoringController.canRestartSession()) {
    throw new Error('Finish the active AI Authoring task before restarting.')
  }

  const document = liveTestProgressController.clearDocument()
  publishLiveTestProgress()
  return document
})

ipcMain.handle('application:login-ncrms-std', async (event) => {
  if (event.sender.id !== applicationWindow?.webContents.id) {
    throw new Error('NCRMS STD login is unavailable to this renderer.')
  }
  const result = await ncrmsStdLoginController.run()
  if (result.status === 'completed') {
    for (const step of result.steps) {
      liveTestProgressController.appendCapturedStep({
        stepNumber: 0,
        description: '',
        action: step.action,
        selector: {
          kind: step.selector ? 'css' : '',
          value: step.selector,
          strategy: step.selector ? 'id' : ''
        },
        playwrightLocator: '',
        ...(step.parameter !== undefined && { parameter: step.parameter })
      })
    }
    publishLiveTestProgress()
  }
  return result
})

ipcMain.handle(
  'direct-tools:get-configuration',
  (event): { enabled: boolean } => {
    if (
      !canInvokeDirectTools(event.sender.id, directToolsWindow?.webContents.id)
    ) {
      throw new Error(
        'The Direct Step Console is unavailable to this renderer.'
      )
    }

    return directToolController.getConfiguration()
  }
)

ipcMain.handle('direct-tools:invoke', (event, request: unknown) => {
  if (
    !canInvokeDirectTools(event.sender.id, directToolsWindow?.webContents.id)
  ) {
    throw new Error('The Direct Step Console is unavailable to this renderer.')
  }

  return directToolController.invoke(request)
})

ipcMain.handle('ai-authoring:run', (event, instruction: unknown) => {
  if (
    !canInvokeAiAuthoring(event.sender.id, applicationWindow?.webContents.id)
  ) {
    throw new Error('AI Authoring is unavailable to this renderer.')
  }

  return aiAuthoringController.run(instruction)
})

ipcMain.handle('ai-authoring:respond', (event, response: unknown) => {
  if (
    !canInvokeAiAuthoring(event.sender.id, applicationWindow?.webContents.id)
  ) {
    throw new Error('AI Authoring is unavailable to this renderer.')
  }
  return aiAuthoringController.respond(response)
})

ipcMain.handle('ai-authoring:stop', (event): void => {
  if (
    !canInvokeAiAuthoring(event.sender.id, applicationWindow?.webContents.id)
  ) {
    throw new Error('AI Authoring is unavailable to this renderer.')
  }
  aiAuthoringController.stop()
})

ipcMain.handle('live-test-progress:get-document', (event) => {
  if (!canAccessLiveTestProgress(event.sender.id)) {
    throw new Error('Live Test Progress is unavailable to this renderer.')
  }
  return liveTestProgressController.getDocument()
})

ipcMain.handle(
  'live-test-progress:update-document',
  (event, document: unknown) => {
    if (!canAccessLiveTestProgress(event.sender.id)) {
      throw new Error('Live Test Progress is unavailable to this renderer.')
    }
    const updated = liveTestProgressController.replaceDocument(document)
    publishLiveTestProgress()
    return updated
  }
)

ipcMain.handle('live-test-progress:run-playwright', async (event, input) => {
  if (!canAccessLiveTestProgress(event.sender.id)) {
    throw new Error('Live Test Progress is unavailable to this renderer.')
  }
  if (
    typeof input !== 'object' ||
    input === null ||
    !('document' in input) ||
    !isLiveTestProgressDocument(input.document) ||
    !('mode' in input) ||
    !isPlaywrightTestRunMode(input.mode)
  ) {
    throw new Error('Playwright requires editable Live Test Progress rows.')
  }
  const testName =
    'testName' in input && typeof input.testName === 'string'
      ? input.testName
      : undefined
  return playwrightTestController.run(input.document, input.mode, testName)
})

ipcMain.handle('agent-testing-console:get-configuration', (event) => {
  if (
    !canInvokeAgentTestingConsole(
      event.sender.id,
      agentTestingConsoleWindow?.webContents.id
    )
  ) {
    throw new Error(
      'The Agent Testing Console is unavailable to this renderer.'
    )
  }

  return agentTestingConsoleController.getConfiguration()
})

ipcMain.handle('agent-testing-console:capture-observation', (event) => {
  if (
    !canInvokeAgentTestingConsole(
      event.sender.id,
      agentTestingConsoleWindow?.webContents.id
    )
  ) {
    throw new Error(
      'The Agent Testing Console is unavailable to this renderer.'
    )
  }

  return agentTestingConsoleController.captureObservation()
})

ipcMain.handle('agent-testing-console:execute', (event, input: unknown) => {
  if (
    !canInvokeAgentTestingConsole(
      event.sender.id,
      agentTestingConsoleWindow?.webContents.id
    )
  ) {
    throw new Error(
      'The Agent Testing Console is unavailable to this renderer.'
    )
  }

  return agentTestingConsoleController.execute(input)
})

ipcMain.handle(
  'browser-workspace:set-bounds',
  (event, bounds: BrowserWorkspaceBounds): void => {
    if (
      event.sender.id !== applicationWindow?.webContents.id ||
      !browserWorkspace
    ) {
      return
    }

    browserWorkspace.setBounds(bounds)
  }
)

app.whenReady().then(() => {
  const window = createApplicationWindow()
  if (process.env.TESTGEN_DIRECT_STEP_CONSOLE === '1') {
    createDirectToolsWindow(window)
  }
  if (process.env.TESTGEN_AGENT_TESTING_CONSOLE === '1') {
    createAgentTestingConsoleWindow(window)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createApplicationWindow()
      if (process.env.TESTGEN_DIRECT_STEP_CONSOLE === '1') {
        createDirectToolsWindow(window)
      }
      if (process.env.TESTGEN_AGENT_TESTING_CONSOLE === '1') {
        createAgentTestingConsoleWindow(window)
      }
    }
  })
})

app.on('window-all-closed', () => {
  // Electron owns the loopback CDP listener for the process. Quitting when the
  // sole product window closes ensures the endpoint closes with its session on
  // every platform, including macOS.
  app.quit()
})

function normalizeSetupUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }
  const trimmed = value.trim()
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}

async function reserveLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Unable to reserve a loopback CDP port.'))
        return
      }

      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(address.port)
      })
    })
  })
}
