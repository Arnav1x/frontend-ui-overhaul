import { describe, expect, it, vi } from 'vitest'

import {
  canInvokeAiAuthoring,
  canInvokeAgentTestingConsole,
  canOpenAgentTestingConsole,
  canOpenDirectTools,
  canInvokeDirectTools,
  canReadBrowserStatus,
  closeDirectToolsWindow
} from './window-access'

describe('window IPC access', () => {
  it('allows browser status for the main and development console windows', () => {
    expect(canReadBrowserStatus(10, 10, 20)).toBe(true)
    expect(canReadBrowserStatus(20, 10, 20)).toBe(true)
    expect(canReadBrowserStatus(30, 10, 20)).toBe(false)
  })

  it('allows direct tools only for the development console window', () => {
    expect(canInvokeDirectTools(20, 20)).toBe(true)
    expect(canInvokeDirectTools(10, 20)).toBe(false)
    expect(canInvokeDirectTools(30, 20)).toBe(false)
  })

  it('allows Agent Testing Console actions only for its own window', () => {
    expect(canInvokeAgentTestingConsole(30, 30)).toBe(true)
    expect(canInvokeAgentTestingConsole(10, 30)).toBe(false)
    expect(canInvokeAgentTestingConsole(20, 30)).toBe(false)
  })

  it('allows opening the development console only from the main window', () => {
    expect(canOpenDirectTools(10, 10)).toBe(true)
    expect(canOpenDirectTools(20, 10)).toBe(false)
    expect(canOpenDirectTools(30, 10)).toBe(false)
  })

  it('allows opening the Agent Testing Console only from the main window', () => {
    expect(canOpenAgentTestingConsole(10, 10)).toBe(true)
    expect(canOpenAgentTestingConsole(20, 10)).toBe(false)
  })

  it('allows AI Authoring only from the main window', () => {
    expect(canInvokeAiAuthoring(10, 10)).toBe(true)
    expect(canInvokeAiAuthoring(20, 10)).toBe(false)
    expect(canInvokeAiAuthoring(30, 10)).toBe(false)
  })

  it('closes a live console with the main window without closing it twice', () => {
    const close = vi.fn()
    closeDirectToolsWindow({ close, isDestroyed: () => false })
    closeDirectToolsWindow({ close, isDestroyed: () => true })
    closeDirectToolsWindow(undefined)

    expect(close).toHaveBeenCalledOnce()
  })
})
