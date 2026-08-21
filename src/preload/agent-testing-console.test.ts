import { describe, expect, it, vi } from 'vitest'

import { createAgentTestingConsoleBridge } from './agent-testing-console'

describe('Agent Testing Console preload bridge', () => {
  it('exposes only the Browser Execution Agent run and observation capture', async () => {
    const invoke = vi.fn(async () => ({
      status: 'success',
      output: 'snapshot'
    }))
    const bridge = createAgentTestingConsoleBridge({ invoke })
    await bridge.getConfiguration()
    await bridge.captureObservation()
    await bridge.execute('Click Search.')

    expect(Object.keys(bridge)).toEqual([
      'captureObservation',
      'execute',
      'getConfiguration'
    ])
    expect(invoke).toHaveBeenNthCalledWith(
      1,
      'agent-testing-console:get-configuration'
    )
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      'agent-testing-console:capture-observation'
    )
    expect(invoke).toHaveBeenNthCalledWith(
      3,
      'agent-testing-console:execute',
      'Click Search.'
    )
  })
})
