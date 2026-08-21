export interface ApplicationIpc {
  invoke: (channel: string) => Promise<unknown>
}

export interface ApplicationBridge {
  getVersion: () => Promise<string>
  getConfiguration: () => Promise<{
    agentTestingConsoleAvailable: boolean
    directToolsAvailable: boolean
  }>
  openAgentTestingConsole: () => Promise<void>
  openDirectTools: () => Promise<void>
  openLiveTestProgress: () => Promise<void>
  restartSession: () => Promise<void>
  loginToNcrmsStd: () => Promise<unknown>
}

export function createApplicationBridge(
  ipc: ApplicationIpc,
  electronVersion: string
): ApplicationBridge {
  return {
    getVersion: (): Promise<string> => Promise.resolve(electronVersion),
    getConfiguration: () =>
      ipc.invoke('application:get-configuration') as Promise<{
        agentTestingConsoleAvailable: boolean
        directToolsAvailable: boolean
      }>,
    openAgentTestingConsole: () =>
      ipc.invoke('application:open-agent-testing-console') as Promise<void>,
    openDirectTools: () =>
      ipc.invoke('application:open-direct-tools') as Promise<void>,
    openLiveTestProgress: () =>
      ipc.invoke('application:open-live-test-progress') as Promise<void>,
    restartSession: () =>
      ipc.invoke('application:restart-session') as Promise<void>,
    loginToNcrmsStd: () => ipc.invoke('application:login-ncrms-std')
  }
}
