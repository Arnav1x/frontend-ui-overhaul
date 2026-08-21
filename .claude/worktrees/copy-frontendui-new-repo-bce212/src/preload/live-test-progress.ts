import type { LiveTestProgressDocument } from '../authoring/live-test-progress'
import type {
  PlaywrightTestRunMode,
  PlaywrightTestRunResult
} from '../authoring/playwright-test-run-result'

export interface LiveTestProgressIpc {
  invoke: (channel: string, input?: unknown) => Promise<unknown>
  on: (
    channel: string,
    listener: (
      event: Electron.IpcRendererEvent,
      document: LiveTestProgressDocument
    ) => void
  ) => void
  removeListener: (
    channel: string,
    listener: (
      event: Electron.IpcRendererEvent,
      document: LiveTestProgressDocument
    ) => void
  ) => void
}

export interface LiveTestProgressBridge {
  getDocument: () => Promise<LiveTestProgressDocument>
  updateDocument: (
    document: LiveTestProgressDocument
  ) => Promise<LiveTestProgressDocument>
  runPlaywright: (
    document: LiveTestProgressDocument,
    mode: PlaywrightTestRunMode
  ) => Promise<PlaywrightTestRunResult>
  onDocumentChange: (
    listener: (document: LiveTestProgressDocument) => void
  ) => () => void
}

export function createLiveTestProgressBridge(
  ipc: LiveTestProgressIpc
): LiveTestProgressBridge {
  return {
    getDocument: () =>
      ipc.invoke(
        'live-test-progress:get-document'
      ) as Promise<LiveTestProgressDocument>,
    updateDocument: (document) =>
      ipc.invoke(
        'live-test-progress:update-document',
        document
      ) as Promise<LiveTestProgressDocument>,
    runPlaywright: (document, mode) =>
      ipc.invoke('live-test-progress:run-playwright', {
        document,
        mode
      }) as Promise<PlaywrightTestRunResult>,
    onDocumentChange: (listener) => {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        document: LiveTestProgressDocument
      ): void => listener(document)
      ipc.on('live-test-progress:document-changed', subscription)
      return () =>
        ipc.removeListener('live-test-progress:document-changed', subscription)
    }
  }
}
