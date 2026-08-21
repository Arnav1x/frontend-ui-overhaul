import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import {
  createBrowserSessionStatus,
  type BrowserSession,
  type BrowserSessionStatus,
  type BrowserSessionStatusListener,
  type NcrmsStdLoginStep
} from './browser-session'
import type {
  BrowserExecutionCommand,
  BrowserExecutionCommandResult
} from './browser-execution-commands'
import {
  parseSelectorCaptureOutput,
  selectorCaptureFunction,
  type BrowserTargetReference,
  type SelectorCaptureResult
} from './selector-capture'
import type {
  DirectBrowserToolRequest,
  DirectBrowserToolResult
} from './direct-browser-tools'

interface McpTool {
  name: string
}

interface McpToolResult {
  content: Array<{ text?: string; type: string }>
  isError?: boolean
}

export interface PlaywrightMcpConnection {
  callTool: (
    name: string,
    arguments_: Record<string, unknown>
  ) => Promise<McpToolResult>
  close: () => Promise<void>
  listTools: () => Promise<{ tools: McpTool[] }>
}

export type PlaywrightMcpConnectionFactory = (
  cdpEndpoint: string,
  onFailure: (error: Error) => void
) => Promise<PlaywrightMcpConnection>

export interface PlaywrightMcpBrowserSessionOptions {
  cdpEndpoint: string
  targetMarker: string
  createConnection?: PlaywrightMcpConnectionFactory
}

/**
 * Product-owned adapter for the local Playwright MCP server. The initial
 * blank document receives a per-launch title marker, which lets this adapter
 * select the WebContentsView without depending on its current URL. Once
 * selected, Playwright keeps the same page through navigation and reloads.
 */
export class PlaywrightMcpBrowserSession implements BrowserSession {
  private connection: PlaywrightMcpConnection | undefined
  private readonly createConnection: PlaywrightMcpConnectionFactory
  private readonly listeners = new Set<BrowserSessionStatusListener>()
  private operation = Promise.resolve()
  private status = createBrowserSessionStatus('starting')

  constructor(private readonly options: PlaywrightMcpBrowserSessionOptions) {
    this.createConnection = options.createConnection ?? createMcpConnection
  }

  getStatus(): BrowserSessionStatus {
    return this.status
  }

  subscribe(listener: BrowserSessionStatusListener): () => void {
    this.listeners.add(listener)
    listener(this.status)

    return () => this.listeners.delete(listener)
  }

  start(): Promise<void> {
    return this.enqueue(async () => {
      try {
        this.ensureAvailable()
        this.connection = await this.createConnection(
          this.options.cdpEndpoint,
          (error) => this.fail(error)
        )

        const { tools } = await this.connection.listTools()
        this.requireTools(tools)

        const tabs = await this.callTool('browser_tabs', { action: 'list' })
        const targetIndex = findTabIndex(tabs, this.options.targetMarker)
        await this.callTool('browser_tabs', {
          action: 'select',
          index: targetIndex
        })
        await this.takeSnapshot()
        this.setStatus(createBrowserSessionStatus('ready'))
      } catch (error) {
        const connection = this.connection
        this.connection = undefined
        if (connection) {
          await connection.close()
        }
        throw error
      }
    })
  }

  markNavigating(): void {
    if (this.status.state === 'closed' || this.status.state === 'failed') {
      return
    }

    this.setStatus(createBrowserSessionStatus('navigating'))
  }

  confirmPageReady(): Promise<void> {
    return this.enqueue(async () => {
      if (this.status.state === 'closed' || this.status.state === 'failed') {
        return
      }

      // Electron can report the initial about:blank load before the MCP client
      // has completed its first target selection. That event is not a separate
      // navigational readiness signal.
      if (!this.connection) {
        return
      }

      await this.takeSnapshot()
      this.setStatus(createBrowserSessionStatus('ready'))
    })
  }

  fail(error: Error): void {
    if (this.status.state === 'closed' || this.status.state === 'failed') {
      return
    }

    this.setStatus(createBrowserSessionStatus('failed', error.message))
  }

  dispose(): Promise<void> {
    return this.enqueue(async () => {
      const connection = this.connection
      this.connection = undefined
      this.setStatus(createBrowserSessionStatus('closed'))

      if (connection) {
        await connection.close()
      }
    })
  }

  invokeDirectTool(
    request: DirectBrowserToolRequest
  ): Promise<DirectBrowserToolResult> {
    return this.enqueue(async () => {
      if (!this.connection) {
        return {
          status: 'failed',
          message: 'The embedded browser is unavailable.'
        }
      }

      try {
        const result = await this.connection.callTool(
          request.name,
          directToolArguments(request)
        )
        if (result.isError) {
          return {
            status: 'failed',
            message: `${request.name} failed: ${toolResultText(result)}`
          }
        }

        return { status: 'success', output: toolResultText(result) }
      } catch (error) {
        const transportError = toError(error)
        this.fail(transportError)
        return { status: 'failed', message: transportError.message }
      }
    }, false)
  }

  invokeBrowserExecutionCommand(
    command: BrowserExecutionCommand
  ): Promise<BrowserExecutionCommandResult> {
    if (command.action === 'wait_for_page_settle') {
      return this.waitForPageSettle()
    }
    const request = browserExecutionCommandToToolRequest(command)
    return this.invokeProductBrowserTool(
      request.name,
      request.arguments,
      command.action
    )
  }

  private waitForPageSettle(): Promise<BrowserExecutionCommandResult> {
    return this.enqueue(async () => {
      if (!this.connection) {
        return {
          status: 'failed',
          message: 'The embedded browser is unavailable.'
        }
      }
      const maximumPolls = 30
      let previousSnapshot: string | undefined
      let stablePolls = 0
      for (let poll = 0; poll < maximumPolls; poll += 1) {
        const snapshot = toolResultText(
          await this.callTool('browser_snapshot', {})
        )
        if (!isLoadingSnapshot(snapshot)) {
          stablePolls = snapshot === previousSnapshot ? stablePolls + 1 : 0
          if (stablePolls >= 1) return { status: 'success', output: snapshot }
        } else {
          stablePolls = 0
        }
        previousSnapshot = snapshot
        await this.callTool('browser_wait_for', { time: 2 })
      }
      return {
        status: 'failed',
        message: 'The page is still loading after the 60-second settle limit.'
      }
    }, false)
  }

  uploadTestFile(path: string): Promise<BrowserExecutionCommandResult> {
    return this.invokeProductBrowserTool(
      'browser_file_upload',
      { paths: [path] },
      'upload_test_file'
    )
  }

  runNcrmsStdLogin(credentials: {
    username: string
    password: string
  }): Promise<
    | { status: 'success'; steps: readonly NcrmsStdLoginStep[] }
    | { status: 'failed'; message: string }
  > {
    return this.enqueue(async () => {
      const loginUrl =
        'https://ncrmsstd.digitalinfuzion.com/NCRMS/Main/Login.aspx'
      if (!this.connection)
        return {
          status: 'failed',
          message: 'The embedded browser is unavailable.'
        }
      try {
        const currentUrl = evaluatedUrl(
          toolResultText(
            await this.callTool('browser_evaluate', {
              function: '() => location.href'
            })
          )
        )
        if (currentUrl !== loginUrl)
          return {
            status: 'failed',
            message: `Login is available only on the NCRMS STD login page. Current page: ${currentUrl || 'unavailable'}.`
          }
        await this.callTool('browser_navigate', { url: loginUrl })
        await this.callTool('browser_evaluate', {
          target: '#ContentPlaceHolderTop_alternate_login_link',
          function: '(element) => element.click()'
        })
        await this.callTool('browser_evaluate', {
          target:
            '#ContentPlaceHolderTop_GlobalLogin_GlobalLoginView_GlobalLogin_UserName',
          function: fillFunction(credentials.username)
        })
        await this.callTool('browser_evaluate', {
          target:
            '#ContentPlaceHolderTop_GlobalLogin_GlobalLoginView_GlobalLogin_Password',
          function: fillFunction(credentials.password)
        })
        await this.callTool('browser_evaluate', {
          target:
            '#ContentPlaceHolderTop_GlobalLogin_GlobalLoginView_GlobalLogin_Login',
          function: '(element) => element.click()'
        })
        return {
          status: 'success',
          steps: [
            { action: 'navigate', selector: '', parameter: loginUrl },
            {
              action: 'click',
              selector: '#ContentPlaceHolderTop_alternate_login_link'
            },
            {
              action: 'fill',
              selector:
                '#ContentPlaceHolderTop_GlobalLogin_GlobalLoginView_GlobalLogin_UserName',
              parameter: credentials.username
            },
            {
              action: 'fill',
              selector:
                '#ContentPlaceHolderTop_GlobalLogin_GlobalLoginView_GlobalLogin_Password',
              parameter: credentials.password
            },
            {
              action: 'click',
              selector:
                '#ContentPlaceHolderTop_GlobalLogin_GlobalLoginView_GlobalLogin_Login'
            }
          ]
        }
      } catch (error) {
        return { status: 'failed', message: toError(error).message }
      }
    }, false)
  }

  captureSelector(
    target: BrowserTargetReference
  ): Promise<SelectorCaptureResult> {
    return this.enqueue(async () => {
      if (!this.connection) {
        return {
          status: 'unresolved',
          message: 'The embedded browser is unavailable.'
        }
      }

      try {
        const result = await this.connection.callTool('browser_evaluate', {
          function: selectorCaptureFunction,
          target: target.target
        })
        if (result.isError) {
          return {
            status: 'unresolved',
            message: `selector capture failed: ${toolResultText(result)}`
          }
        }

        return parseSelectorCaptureOutput(toolResultText(result))
      } catch (error) {
        const transportError = toError(error)
        this.fail(transportError)
        return { status: 'unresolved', message: transportError.message }
      }
    }, false)
  }

  private invokeProductBrowserTool(
    toolName: string,
    arguments_: Record<string, unknown>,
    operationName: string
  ): Promise<BrowserExecutionCommandResult> {
    return this.enqueue(async () => {
      if (!this.connection) {
        return {
          status: 'failed',
          message: 'The embedded browser is unavailable.'
        }
      }

      try {
        const result = await this.connection.callTool(toolName, arguments_)
        if (result.isError) {
          return {
            status: 'failed',
            message: `${operationName} failed: ${toolResultText(result)}`
          }
        }

        return { status: 'success', output: toolResultText(result) }
      } catch (error) {
        const transportError = toError(error)
        this.fail(transportError)
        return { status: 'failed', message: transportError.message }
      }
    }, false)
  }

  private callTool(
    name: string,
    arguments_: Record<string, unknown>
  ): Promise<McpToolResult> {
    if (!this.connection) {
      throw new Error('Playwright MCP is not connected.')
    }

    return this.connection.callTool(name, arguments_).then((result) => {
      if (result.isError) {
        throw new Error(`${name} failed: ${toolResultText(result)}`)
      }

      return result
    })
  }

  private async takeSnapshot(): Promise<void> {
    await this.callTool('browser_snapshot', {})
  }

  private requireTools(tools: McpTool[]): void {
    const availableTools = new Set(tools.map((tool) => tool.name))
    for (const requiredTool of [
      'browser_tabs',
      'browser_snapshot',
      'browser_evaluate'
    ]) {
      if (!availableTools.has(requiredTool)) {
        throw new Error(`Playwright MCP did not provide ${requiredTool}.`)
      }
    }
  }

  private ensureAvailable(): void {
    if (this.status.state === 'closed') {
      throw new Error('The browser session is closed.')
    }
    if (this.status.state === 'failed') {
      throw new Error('The browser session has failed.')
    }
    if (this.connection) {
      throw new Error('The browser session is already connected.')
    }
  }

  private enqueue<T>(
    operation: () => Promise<T>,
    failOnError = true
  ): Promise<T> {
    const nextOperation = this.operation.then(operation)
    this.operation = nextOperation.then(
      () => undefined,
      () => undefined
    )
    if (!failOnError) {
      return nextOperation
    }

    return nextOperation.catch((error: unknown) => {
      this.fail(toError(error))
      throw error
    })
  }

  private setStatus(status: BrowserSessionStatus): void {
    this.status = status
    for (const listener of this.listeners) {
      listener(status)
    }
  }
}

function directToolArguments(
  request: DirectBrowserToolRequest
): Record<string, string> {
  switch (request.name) {
    case 'browser_snapshot':
      return {}
    case 'browser_navigate':
      return { url: request.url }
    case 'browser_click':
      return { target: request.target }
    case 'browser_type':
      return { target: request.target, text: request.text }
  }
}

function browserExecutionCommandToToolRequest(
  command: BrowserExecutionCommand
): {
  name: string
  arguments: Record<string, unknown>
} {
  switch (command.action) {
    case 'observe':
      return { name: 'browser_snapshot', arguments: {} }
    case 'navigate':
      return { name: 'browser_navigate', arguments: { url: command.url } }
    case 'click':
      return { name: 'browser_click', arguments: { target: command.target } }
    case 'type':
      return {
        name: 'browser_type',
        arguments: { target: command.target, text: command.text }
      }
    case 'upload_test_file':
      throw new Error('File upload is routed through the fixed upload method.')
    case 'wait_for_page_settle':
      throw new Error(
        'Page settling is routed through the fixed settle method.'
      )
  }
}

export function findTabIndex(
  tabResult: McpToolResult,
  targetMarker: string
): number {
  const matchingLine = toolResultText(tabResult)
    .split(/\r?\n/)
    .find((line) => line.includes(targetMarker))
  const index = matchingLine?.match(/(?:^|\s|-)(\d+):/)?.[1]

  if (!index) {
    throw new Error(
      'Playwright MCP could not identify the product-owned embedded browser target.'
    )
  }

  return Number.parseInt(index, 10)
}

function toolResultText(result: McpToolResult): string {
  return result.content
    .filter((content) => content.type === 'text')
    .map((content) => content.text ?? '')
    .join('\n')
}

async function createMcpConnection(
  cdpEndpoint: string,
  onFailure: (error: Error) => void
): Promise<PlaywrightMcpConnection> {
  const require = createRequire(import.meta.url)
  const packageDirectory = dirname(
    require.resolve('@playwright/mcp/package.json')
  )
  const transport = new StdioClientTransport({
    args: [join(packageDirectory, 'cli.js'), '--cdp-endpoint', cdpEndpoint],
    // In Electron, process.execPath is electron.exe. Playwright MCP is a Node
    // stdio server, so use the Node executable that npm placed on PATH.
    command: process.env.npm_node_execpath ?? 'node',
    cwd: process.cwd(),
    stderr: 'pipe'
  })
  const client = new Client({
    name: 'testgen-browser-session',
    version: '0.1.0'
  })

  transport.stderr?.on('data', (chunk: Buffer) => {
    console.error(`Playwright MCP: ${chunk.toString().trim()}`)
  })
  transport.onerror = onFailure
  transport.onclose = () => onFailure(new Error('Playwright MCP closed.'))
  await client.connect(transport)

  return {
    callTool: async (name, arguments_) =>
      client.callTool({ name, arguments: arguments_ }),
    close: () => client.close(),
    listTools: () => client.listTools()
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function fillFunction(value: string): string {
  return `(element) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; set?.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); }`
}

function isLoadingSnapshot(snapshot: string): boolean {
  return /\bloading\b/i.test(snapshot)
}

function evaluatedUrl(output: string): string | undefined {
  const match = output.match(/https:\/\/[^\s"'`]+/)
  return match?.[0]
}
