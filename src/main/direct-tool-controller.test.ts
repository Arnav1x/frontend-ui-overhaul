import { describe, expect, it, vi } from 'vitest'

import type { BrowserSession } from '../browser/browser-session'
import { DirectToolController } from './direct-tool-controller'

function createBrowserSession(): BrowserSession {
  return {
    dispose: async () => undefined,
    getStatus: () => ({ state: 'ready' }),
    captureSelector: vi.fn(async () => ({
      status: 'unresolved' as const,
      message: 'not used by direct tools'
    })),
    invokeBrowserExecutionCommand: vi.fn(async () => ({
      status: 'success' as const,
      output: 'authoring result'
    })),
    invokeDirectTool: vi.fn(async () => ({
      status: 'success' as const,
      output: 'raw tool output'
    })),
    runNcrmsStdLogin: vi.fn(async () => ({
      status: 'failed' as const,
      message: 'unused'
    })),
    uploadTestFile: vi.fn(async () => ({
      status: 'success' as const,
      output: 'uploaded'
    })),
    start: async () => undefined,
    subscribe: () => () => undefined
  }
}

describe('DirectToolController', () => {
  it('delegates each allowed request variant to BrowserSession', async () => {
    const browserSession = createBrowserSession()
    const controller = new DirectToolController({
      enabled: true,
      getBrowserSession: () => browserSession
    })

    for (const request of [
      { name: 'browser_snapshot' },
      { name: 'browser_navigate', url: 'https://example.test' },
      { name: 'browser_click', target: 'e1' },
      { name: 'browser_type', target: 'e2', text: 'value' }
    ]) {
      await expect(controller.invoke(request)).resolves.toEqual({
        status: 'success',
        output: 'raw tool output'
      })
    }

    expect(browserSession.invokeDirectTool).toHaveBeenCalledWith({
      name: 'browser_snapshot'
    })
    expect(browserSession.invokeDirectTool).toHaveBeenCalledWith({
      name: 'browser_navigate',
      url: 'https://example.test'
    })
    expect(browserSession.invokeDirectTool).toHaveBeenCalledWith({
      name: 'browser_click',
      target: 'e1'
    })
    expect(browserSession.invokeDirectTool).toHaveBeenCalledWith({
      name: 'browser_type',
      target: 'e2',
      text: 'value'
    })
  })

  it('rejects malformed input before reaching BrowserSession', async () => {
    const browserSession = createBrowserSession()
    const controller = new DirectToolController({
      enabled: true,
      getBrowserSession: () => browserSession
    })

    await expect(
      controller.invoke({ name: 'browser_tabs', action: 'list' })
    ).resolves.toEqual({
      status: 'rejected',
      message: 'The requested browser tool or its required inputs are invalid.'
    })
    expect(browserSession.invokeDirectTool).not.toHaveBeenCalled()
  })

  it('rejects invocations when the console is disabled', async () => {
    const browserSession = createBrowserSession()
    const controller = new DirectToolController({
      enabled: false,
      getBrowserSession: () => browserSession
    })

    await expect(
      controller.invoke({ name: 'browser_snapshot' })
    ).resolves.toEqual({
      status: 'rejected',
      message: 'The Direct Step Console is disabled for this launch.'
    })
    expect(browserSession.invokeDirectTool).not.toHaveBeenCalled()
  })

  it('returns the typed BrowserSession result unchanged', async () => {
    const browserSession = createBrowserSession()
    vi.mocked(browserSession.invokeDirectTool).mockResolvedValue({
      status: 'failed',
      message: 'browser_click failed: target is stale'
    })
    const controller = new DirectToolController({
      enabled: true,
      getBrowserSession: () => browserSession
    })

    await expect(
      controller.invoke({ name: 'browser_click', target: 'e1' })
    ).resolves.toEqual({
      status: 'failed',
      message: 'browser_click failed: target is stale'
    })
  })
})
