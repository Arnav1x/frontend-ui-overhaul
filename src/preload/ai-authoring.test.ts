import { describe, expect, it, vi } from 'vitest'

import type { BrowserExecutionTraceEvent } from '../authoring/browser-execution-agent-run-result'
import { createAiAuthoringBridge } from './ai-authoring'

describe('AI Authoring preload bridge', () => {
  it('exposes the bounded run, respond, and stop operations', async () => {
    const invoke = vi.fn(async () => ({ status: 'failed', callsUsed: 0 }))
    const bridge = createAiAuthoringBridge({
      invoke,
      on: vi.fn(),
      removeListener: vi.fn()
    })

    await bridge.run('Open the help page.')
    await bridge.respond('Use the first result.')
    await bridge.stop()

    expect(Object.keys(bridge)).toEqual([
      'run',
      'respond',
      'stop',
      'onTraceEvent'
    ])
    expect(invoke).toHaveBeenCalledWith(
      'ai-authoring:run',
      'Open the help page.'
    )
    expect(invoke).toHaveBeenCalledWith(
      'ai-authoring:respond',
      'Use the first result.'
    )
    expect(invoke).toHaveBeenCalledWith('ai-authoring:stop')
  })

  it('subscribes to trace events and unsubscribes the same listener', () => {
    const on = vi.fn()
    const removeListener = vi.fn()
    const bridge = createAiAuthoringBridge({
      invoke: vi.fn(async () => undefined),
      on,
      removeListener
    })

    const received: BrowserExecutionTraceEvent[] = []
    const unsubscribe = bridge.onTraceEvent((event) => received.push(event))

    expect(on).toHaveBeenCalledWith(
      'ai-authoring:trace-event',
      expect.any(Function)
    )
    const subscription = on.mock.calls[0][1] as (
      event: unknown,
      traceEvent: BrowserExecutionTraceEvent
    ) => void
    const traceEvent: BrowserExecutionTraceEvent = {
      kind: 'tool_result',
      action: 'click',
      result: { status: 'success', output: 'clicked' },
      callsUsed: 2
    }
    subscription(undefined, traceEvent)
    expect(received).toEqual([traceEvent])

    unsubscribe()
    expect(removeListener).toHaveBeenCalledWith(
      'ai-authoring:trace-event',
      subscription
    )
  })
})
