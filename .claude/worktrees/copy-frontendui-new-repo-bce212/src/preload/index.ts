import { contextBridge, ipcRenderer } from 'electron'

import type {
  BrowserSessionStatus,
  BrowserWorkspaceBounds
} from '../browser/browser-session'
import { createApplicationBridge } from './application'
import { createAgentTestingConsoleBridge } from './agent-testing-console'
import { createAiAuthoringBridge } from './ai-authoring'
import { createDirectToolsBridge } from './direct-tools'
import { createLiveTestProgressBridge } from './live-test-progress'

const applicationBridge = createApplicationBridge(
  ipcRenderer,
  process.versions.electron
)

const browserBridge = {
  getStatus: (): Promise<BrowserSessionStatus> =>
    ipcRenderer.invoke('browser-session:get-status'),
  onStatusChange: (
    listener: (status: BrowserSessionStatus) => void
  ): (() => void) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      status: BrowserSessionStatus
    ): void => listener(status)
    ipcRenderer.on('browser-session:status', subscription)

    return () =>
      ipcRenderer.removeListener('browser-session:status', subscription)
  },
  setWorkspaceBounds: (bounds: BrowserWorkspaceBounds): Promise<void> =>
    ipcRenderer.invoke('browser-workspace:set-bounds', bounds)
}

const directToolsBridge = createDirectToolsBridge(ipcRenderer)
const aiAuthoringBridge = createAiAuthoringBridge(ipcRenderer)
const agentTestingConsoleBridge = createAgentTestingConsoleBridge(ipcRenderer)
const liveTestProgressBridge = createLiveTestProgressBridge(ipcRenderer)

contextBridge.exposeInMainWorld('testGen', {
  application: applicationBridge,
  browser: browserBridge,
  aiAuthoring: aiAuthoringBridge,
  liveTestProgress: liveTestProgressBridge,
  agentTestingConsole: agentTestingConsoleBridge,
  directTools: directToolsBridge
})
