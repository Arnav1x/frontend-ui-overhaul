import type { BrowserExecutionAgentRunResult } from '../authoring/browser-execution-agent-run-result'

export interface AiAuthoringIpc {
  invoke: (channel: string, instruction: string) => Promise<unknown>
}

export interface AiAuthoringBridge {
  run: (instruction: string) => Promise<BrowserExecutionAgentRunResult>
  respond: (response: string) => Promise<BrowserExecutionAgentRunResult>
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
      ) as Promise<BrowserExecutionAgentRunResult>
  }
}
