import { describe, expect, it } from 'vitest'

import {
  aiAuthoringResultDetail,
  aiAuthoringRunPresentation
} from './ai-authoring-presentation'

describe('AI Authoring presentation', () => {
  it('keeps an in-progress run distinct from its terminal result', () => {
    expect(aiAuthoringRunPresentation(undefined, true)).toBe(
      'AI Authoring is executing the intent.'
    )
    expect(aiAuthoringRunPresentation(undefined, false)).toBe(
      'No AI Authoring intent has run.'
    )
  })

  it('reports a successful browser action without claiming a test step exists', () => {
    const result = {
      status: 'completed' as const,
      actions: ['type'] as const,
      output: 'Filled the username field.',
      callsUsed: 4,
      testDocument: { steps: [] }
    }

    expect(aiAuthoringRunPresentation(result, false)).toBe(
      'Completed 1 browser action after 4 calls.'
    )
    expect(aiAuthoringResultDetail(result)).toBe('Filled the username field.')
  })

  it('explains a stopped run and its reason', () => {
    expect(
      aiAuthoringRunPresentation(
        {
          status: 'stopped',
          reason: 'call_limit_reached',
          callsUsed: 12
        },
        false
      )
    ).toBe('Stopped: the configured call limit was reached (12 calls).')
    expect(
      aiAuthoringRunPresentation(
        {
          status: 'stopped',
          reason: 'user_requested',
          callsUsed: 5
        },
        false
      )
    ).toBe('Stopped: you stopped the run (5 calls).')
  })
})
