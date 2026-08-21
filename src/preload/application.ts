export interface ApplicationIpc {
  invoke: (channel: string, input?: unknown) => Promise<unknown>
}

export interface ApplicationBridge {
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
    openUrl: (url) => ipc.invoke('application:open-url', url),
    restartBrowser: () =>
      ipc.invoke('application:restart-browser') as Promise<void>,
    restartSession: () =>
      ipc.invoke('application:restart-session') as Promise<void>,
    loginToNcrmsStd: () => ipc.invoke('application:login-ncrms-std')
  }
}
