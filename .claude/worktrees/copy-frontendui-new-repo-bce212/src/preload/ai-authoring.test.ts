import { describe, expect, it, vi } from 'vitest'

import { createAiAuthoringBridge } from './ai-authoring'

describe('AI Authoring preload bridge', () => {
  it('exposes only one instructed-step operation', async () => {
    const invoke = vi.fn(async () => ({ status: 'failed', callsUsed: 0 }))
    const bridge = createAiAuthoringBridge({ invoke })

    await bridge.run('Open the help page.')
    await bridge.respond('Use the first result.')

    expect(Object.keys(bridge)).toEqual(['run', 'respond'])
    expect(invoke).toHaveBeenCalledWith(
      'ai-authoring:run',
      'Open the help page.'
    )
    expect(invoke).toHaveBeenCalledWith(
      'ai-authoring:respond',
      'Use the first result.'
    )
  })
})
