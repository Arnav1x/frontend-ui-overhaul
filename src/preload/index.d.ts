import type {
  BrowserSessionStatus,
  BrowserWorkspaceBounds
} from '../browser/browser-session'
import type {
  DirectBrowserToolRequest,
  DirectBrowserToolResult
} from '../browser/direct-browser-tools'
import type {
  BrowserExecutionAgentRunResult,
  BrowserExecutionTraceEvent
} from '../authoring/browser-execution-agent-run-result'
import type { BrowserExecutionCommandResult } from '../browser/browser-execution-commands'
import type { LiveTestProgressDocument } from '../authoring/live-test-progress'
import type {
  PlaywrightTestRunMode,
  PlaywrightTestRunResult
} from '../authoring/playwright-test-run-result'

export {}

declare global {
  interface Window {
    testGen: {
      application: {
        getVersion: () => Promise<string>
        getConfiguration: () => Promise<{
          agentTestingConsoleAvailable: boolean
          directToolsAvailable: boolean
        }>
        openAgentTestingConsole: () => Promise<void>
        openDirectTools: () => Promise<void>
        openUrl: (url: string) => Promise<unknown>
        restartBrowser: () => Promise<void>
        restartSession: () => Promise<void>
        loginToNcrmsStd: () => Promise<unknown>
      }
      browser: {
        getStatus: () => Promise<BrowserSessionStatus>
        onStatusChange: (
          listener: (status: BrowserSessionStatus) => void
        ) => () => void
        setWorkspaceBounds: (bounds: BrowserWorkspaceBounds) => Promise<void>
      }
      aiAuthoring: {
        run: (instruction: string) => Promise<BrowserExecutionAgentRunResult>
        respond: (response: string) => Promise<BrowserExecutionAgentRunResult>
        stop: () => Promise<void>
        onTraceEvent: (
          listener: (event: BrowserExecutionTraceEvent) => void
        ) => () => void
      }
      liveTestProgress: {
        getDocument: () => Promise<LiveTestProgressDocument>
        updateDocument: (
          document: LiveTestProgressDocument
        ) => Promise<LiveTestProgressDocument>
        runPlaywright: (
          document: LiveTestProgressDocument,
          mode: PlaywrightTestRunMode,
          testName?: string
        ) => Promise<PlaywrightTestRunResult>
        onDocumentChange: (
          listener: (document: LiveTestProgressDocument) => void
        ) => () => void
      }
      agentTestingConsole: {
        captureObservation: () => Promise<BrowserExecutionCommandResult>
        execute: (
          instruction: string
        ) => Promise<BrowserExecutionAgentRunResult>
        getConfiguration: () => Promise<{ enabled: boolean }>
      }
      directTools: {
        getConfiguration: () => Promise<{ enabled: boolean }>
        invoke: (
          request: DirectBrowserToolRequest
        ) => Promise<DirectBrowserToolResult>
      }
    }
  }
}
