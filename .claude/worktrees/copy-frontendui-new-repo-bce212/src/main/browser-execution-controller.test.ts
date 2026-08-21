import { describe, expect, it, vi } from 'vitest'

import type { BrowserSession } from '../browser/browser-session'
import { BrowserExecutionController } from './browser-execution-controller'

function createBrowserSession(): BrowserSession {
  return {
    dispose: async () => undefined,
    getStatus: () => ({ state: 'ready' }),
    invokeBrowserExecutionCommand: vi.fn(async () => ({
      status: 'success' as const,
      output: 'browser result'
    })),
    captureSelector: vi.fn(async () => ({
      status: 'captured' as const,
      selector: {
        kind: 'css' as const,
        value: '#target',
        strategy: 'id' as const
      },
      quality: 'stable-attribute' as const
    })),
    invokeDirectTool: vi.fn(async () => ({
      status: 'success' as const,
      output: 'direct console result'
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

describe('BrowserExecutionController', () => {
  it('delegates each fixed Browser Execution Agent command through BrowserSession', async () => {
    const browserSession = createBrowserSession()
    const controller = new BrowserExecutionController({
      getBrowserSession: () => browserSession
    })

    for (const command of [
      { action: 'observe' },
      { action: 'navigate', url: 'https://example.test' },
      { action: 'click', target: 'e1' },
      { action: 'type', target: 'e2', text: 'value' },
      { action: 'upload_test_file' }
    ]) {
      await expect(controller.invoke(command)).resolves.toEqual({
        status: 'success',
        output: 'browser result'
      })
    }

    expect(browserSession.invokeBrowserExecutionCommand).toHaveBeenCalledWith({
      action: 'observe'
    })
    expect(browserSession.uploadTestFile).toHaveBeenCalledWith(
      expect.stringMatching(/src[\\/]fixtures[\\/]test\.txt$/)
    )
    expect(browserSession.invokeBrowserExecutionCommand).toHaveBeenCalledWith({
      action: 'navigate',
      url: 'https://example.test'
    })
    expect(browserSession.invokeBrowserExecutionCommand).toHaveBeenCalledWith({
      action: 'click',
      target: 'e1'
    })
    expect(browserSession.invokeBrowserExecutionCommand).toHaveBeenCalledWith({
      action: 'type',
      target: 'e2',
      text: 'value'
    })
    expect(browserSession.invokeDirectTool).not.toHaveBeenCalled()
  })

  it('rejects unsupported commands before they reach BrowserSession', async () => {
    const browserSession = createBrowserSession()
    const controller = new BrowserExecutionController({
      getBrowserSession: () => browserSession
    })

    await expect(
      controller.invoke({ name: 'browser_tabs', action: 'list' })
    ).resolves.toEqual({
      status: 'rejected',
      message:
        'The requested Browser Execution Agent command or its required inputs are invalid.'
    })

    expect(browserSession.invokeBrowserExecutionCommand).not.toHaveBeenCalled()
    expect(browserSession.invokeDirectTool).not.toHaveBeenCalled()
  })

  it('reports an unavailable embedded browser without a direct-tool fallback', async () => {
    const controller = new BrowserExecutionController({
      getBrowserSession: () => undefined
    })

    await expect(controller.invoke({ action: 'observe' })).resolves.toEqual({
      status: 'failed',
      message: 'The embedded browser is unavailable.'
    })
  })

  it('captures a selector only through BrowserSession', async () => {
    const browserSession = createBrowserSession()
    const controller = new BrowserExecutionController({
      getBrowserSession: () => browserSession
    })

    await expect(controller.captureSelector({ target: 'e1' })).resolves.toEqual(
      {
        status: 'captured',
        selector: { kind: 'css', value: '#target', strategy: 'id' },
        quality: 'stable-attribute'
      }
    )
    expect(browserSession.captureSelector).toHaveBeenCalledWith({
      target: 'e1'
    })
  })
})
