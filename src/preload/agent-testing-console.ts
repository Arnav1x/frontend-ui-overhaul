import type { BrowserExecutionAgentRunResult } from '../authoring/browser-execution-agent-run-result'
import type { BrowserExecutionCommandResult } from '../browser/browser-execution-commands'

export interface AgentTestingConsoleIpc {
  invoke: (channel: string, input?: unknown) => Promise<unknown>
}

export interface AgentTestingConsoleBridge {
  captureObservation: () => Promise<BrowserExecutionCommandResult>
  execute: (instruction: string) => Promise<BrowserExecutionAgentRunResult>
  getConfiguration: () => Promise<{ enabled: boolean }>
}

export function createAgentTestingConsoleBridge(
  ipc: AgentTestingConsoleIpc
): AgentTestingConsoleBridge {
  return {
    captureObservation: () =>
      ipc.invoke(
        'agent-testing-console:capture-observation'
      ) as Promise<BrowserExecutionCommandResult>,
    execute: (instruction) =>
      ipc.invoke(
        'agent-testing-console:execute',
        instruction
      ) as Promise<BrowserExecutionAgentRunResult>,
    getConfiguration: () =>
      ipc.invoke('agent-testing-console:get-configuration') as Promise<{
        enabled: boolean
      }>
  }
}
