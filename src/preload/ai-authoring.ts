import type {
  BrowserExecutionAgentRunResult,
  BrowserExecutionTraceEvent
} from '../authoring/browser-execution-agent-run-result'

export interface AiAuthoringIpc {
  invoke: (channel: string, instruction?: string) => Promise<unknown>
  on: (
    channel: string,
    listener: (
      event: Electron.IpcRendererEvent,
      traceEvent: BrowserExecutionTraceEvent
    ) => void
  ) => void
  removeListener: (
    channel: string,
    listener: (
      event: Electron.IpcRendererEvent,
      traceEvent: BrowserExecutionTraceEvent
    ) => void
  ) => void
}

export interface AiAuthoringBridge {
  run: (instruction: string) => Promise<BrowserExecutionAgentRunResult>
  respond: (response: string) => Promise<BrowserExecutionAgentRunResult>
  stop: () => Promise<void>
  onTraceEvent: (
    listener: (event: BrowserExecutionTraceEvent) => void
  ) => () => void
}

export function createAiAuthoringBridge(
  ipc: AiAuthoringIpc
): AiAuthoringBridge {
  return {
    run: (instruction) =>
      ipc.invoke(
        'ai-authoring:run',
        instruction
      ) as Promise<BrowserExecutionAgentRunResult>,
    respond: (response) =>
      ipc.invoke(
        'ai-authoring:respond',
        response
      ) as Promise<BrowserExecutionAgentRunResult>,
    stop: () => ipc.invoke('ai-authoring:stop') as Promise<void>,
    onTraceEvent: (listener) => {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        traceEvent: BrowserExecutionTraceEvent
      ): void => listener(traceEvent)
      ipc.on('ai-authoring:trace-event', subscription)
      return () => ipc.removeListener('ai-authoring:trace-event', subscription)
    }
  }
}
