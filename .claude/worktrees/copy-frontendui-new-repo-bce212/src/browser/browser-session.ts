export const browserSessionStates = [
  'starting',
  'ready',
  'navigating',
  'failed',
  'closed'
] as const

export type BrowserSessionState = (typeof browserSessionStates)[number]

export interface BrowserSessionStatus {
  state: BrowserSessionState
  detail?: string
}

export interface BrowserWorkspaceBounds {
  x: number
  y: number
  width: number
  height: number
}

export type BrowserSessionStatusListener = (
  status: BrowserSessionStatus
) => void

import type {
  BrowserExecutionCommand,
  BrowserExecutionCommandResult
} from './browser-execution-commands'
import type {
  BrowserTargetReference,
  SelectorCaptureResult
} from './selector-capture'
import type {
  DirectBrowserToolRequest,
  DirectBrowserToolResult
} from './direct-browser-tools'

/**
 * The product boundary for the one browser instance owned by TestGen.
 *
 * Future authoring, recording, and execution code depend on this contract,
 * rather than Electron, CDP, MCP, or Playwright objects.
 */
export interface BrowserSession {
  getStatus: () => BrowserSessionStatus
  subscribe: (listener: BrowserSessionStatusListener) => () => void
  start: () => Promise<void>
  invokeDirectTool: (
    request: DirectBrowserToolRequest
  ) => Promise<DirectBrowserToolResult>
  invokeBrowserExecutionCommand: (
    command: BrowserExecutionCommand
  ) => Promise<BrowserExecutionCommandResult>
  uploadTestFile: (path: string) => Promise<BrowserExecutionCommandResult>
  captureSelector: (
    target: BrowserTargetReference
  ) => Promise<SelectorCaptureResult>
  runNcrmsStdLogin: (credentials: {
    username: string
    password: string
  }) => Promise<
    | { status: 'success'; steps: readonly NcrmsStdLoginStep[] }
    | { status: 'failed'; message: string }
  >
  dispose: () => Promise<void>
}

export interface NcrmsStdLoginStep {
  action: 'navigate' | 'click' | 'fill'
  selector: string
  parameter?: string
}

export function createBrowserSessionStatus(
  state: BrowserSessionState,
  detail?: string
): BrowserSessionStatus {
  return detail ? { state, detail } : { state }
}
