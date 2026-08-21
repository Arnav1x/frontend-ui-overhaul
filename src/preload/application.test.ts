import { describe, expect, it, vi } from 'vitest'

import { createApplicationBridge } from './application'

describe('application preload bridge', () => {
  it('exposes the workspace operations without browser-tool access', async () => {
    const invoke = vi.fn(async () => ({
      agentTestingConsoleAvailable: true,
      directToolsAvailable: true
    }))
    const bridge = createApplicationBridge({ invoke }, '43.2.0')

    await bridge.getVersion()
    await bridge.getConfiguration()
    await bridge.openAgentTestingConsole()
    await bridge.openDirectTools()
    await bridge.openUrl('https://example.com')
    await bridge.restartBrowser()
    await bridge.restartSession()
    await bridge.loginToNcrmsStd()

    expect(Object.keys(bridge)).toEqual([
      'getVersion',
      'getConfiguration',
      'openAgentTestingConsole',
      'openDirectTools',
      'openUrl',
      'restartBrowser',
      'restartSession',
      'loginToNcrmsStd'
    ])
    expect(invoke).toHaveBeenNthCalledWith(1, 'application:get-configuration')
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      'application:open-agent-testing-console'
    )
    expect(invoke).toHaveBeenNthCalledWith(3, 'application:open-direct-tools')
    expect(invoke).toHaveBeenNthCalledWith(
      4,
      'application:open-url',
      'https://example.com'
    )
    expect(invoke).toHaveBeenNthCalledWith(5, 'application:restart-browser')
    expect(invoke).toHaveBeenNthCalledWith(6, 'application:restart-session')
    expect(invoke).toHaveBeenNthCalledWith(7, 'application:login-ncrms-std')
  })
})
