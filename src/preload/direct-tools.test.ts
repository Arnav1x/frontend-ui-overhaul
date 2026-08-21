import { describe, expect, it, vi } from 'vitest'

import { createDirectToolsBridge } from './direct-tools'

describe('Direct Step Console preload bridge', () => {
  it('exposes only configuration and fixed-request invocation', async () => {
    const invoke = vi.fn(async () => ({ status: 'success', output: 'raw' }))
    const bridge = createDirectToolsBridge({ invoke })

    await bridge.getConfiguration()
    await bridge.invoke({ name: 'browser_click', target: 'e1' })

    expect(Object.keys(bridge)).toEqual(['getConfiguration', 'invoke'])
    expect(invoke).toHaveBeenNthCalledWith(1, 'direct-tools:get-configuration')
    expect(invoke).toHaveBeenNthCalledWith(2, 'direct-tools:invoke', {
      name: 'browser_click',
      target: 'e1'
    })
  })
})
