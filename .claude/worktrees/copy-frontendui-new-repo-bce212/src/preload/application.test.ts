import { describe, expect, it, vi } from 'vitest'

import { createApplicationBridge } from './application'

describe('application preload bridge', () => {
  it('exposes the development-console launcher without browser-tool access', async () => {
    const invoke = vi.fn(async () => ({
      agentTestingConsoleAvailable: true,
      directToolsAvailable: true
    }))
    const bridge = createApplicationBridge({ invoke }, '43.2.0')

    await bridge.getVersion()
    await bridge.getConfiguration()
    await bridge.openAgentTestingConsole()
    await bridge.openDirectTools()
    await bridge.openLiveTestProgress()
    await bridge.restartSession()

    expect(Object.keys(bridge)).toEqual([
      'getVersion',
      'getConfiguration',
      'openAgentTestingConsole',
      'openDirectTools',
      'openLiveTestProgress',
      'restartSession'
    ])
    expect(invoke).toHaveBeenNthCalledWith(1, 'application:get-configuration')
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      'application:open-agent-testing-console'
    )
    expect(invoke).toHaveBeenNthCalledWith(3, 'application:open-direct-tools')
    expect(invoke).toHaveBeenNthCalledWith(
      4,
      'application:open-live-test-progress'
    )
    expect(invoke).toHaveBeenNthCalledWith(5, 'application:restart-session')
  })
})
