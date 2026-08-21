import type {
  DirectBrowserToolRequest,
  DirectBrowserToolResult,
  DirectToolsBridge
} from '../browser/direct-browser-tools'

export interface DirectToolsIpc {
  invoke: (
    channel: string,
    request?: DirectBrowserToolRequest
  ) => Promise<unknown>
}

export function createDirectToolsBridge(
  ipc: DirectToolsIpc
): DirectToolsBridge {
  return {
    getConfiguration: () =>
      ipc.invoke('direct-tools:get-configuration') as Promise<{
        enabled: boolean
      }>,
    invoke: (request) =>
      ipc.invoke(
        'direct-tools:invoke',
        request
      ) as Promise<DirectBrowserToolResult>
  }
}
