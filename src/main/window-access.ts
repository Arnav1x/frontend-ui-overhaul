export function canReadBrowserStatus(
  senderId: number,
  mainWindowId: number | undefined,
  directToolsWindowId: number | undefined,
  agentTestingWindowId?: number | undefined
): boolean {
  return (
    senderId === mainWindowId ||
    senderId === directToolsWindowId ||
    senderId === agentTestingWindowId
  )
}

export function canInvokeAgentTestingConsole(
  senderId: number,
  agentTestingWindowId: number | undefined
): boolean {
  return senderId === agentTestingWindowId
}

export function canInvokeDirectTools(
  senderId: number,
  directToolsWindowId: number | undefined
): boolean {
  return senderId === directToolsWindowId
}

export function canOpenDirectTools(
  senderId: number,
  mainWindowId: number | undefined
): boolean {
  return senderId === mainWindowId
}

export function canOpenAgentTestingConsole(
  senderId: number,
  mainWindowId: number | undefined
): boolean {
  return senderId === mainWindowId
}

export function canInvokeAiAuthoring(
  senderId: number,
  mainWindowId: number | undefined
): boolean {
  return senderId === mainWindowId
}

export interface ClosableDirectToolsWindow {
  close: () => void
  isDestroyed: () => boolean
}

export function closeDirectToolsWindow(
  window: ClosableDirectToolsWindow | undefined
): void {
  if (window && !window.isDestroyed()) {
    window.close()
  }
}
