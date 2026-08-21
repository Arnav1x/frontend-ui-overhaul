import { describe, expect, it } from 'vitest'

import {
  createCanonicalStep,
  createCanonicalTestDocument
} from './canonical-test-document'

describe('canonical test document', () => {
  it('represents neutral and preconfigured starting states', () => {
    expect(createCanonicalTestDocument({ startingState: 'neutral' })).toEqual({
      startingState: 'neutral',
      steps: []
    })
    expect(
      createCanonicalTestDocument({
        startingState: 'preconfigured',
        startingStateNotes: 'Signed in as a study coordinator.'
      })
    ).toEqual({
      startingState: 'preconfigured',
      startingStateNotes: 'Signed in as a study coordinator.',
      steps: []
    })
  })

  it('initializes notes and source for new steps', () => {
    expect(
      createCanonicalStep({
        action: 'fill',
        selector: { kind: 'css', value: '#subject-id' },
        parameter: '123'
      })
    ).toEqual({
      action: 'fill',
      selector: { kind: 'css', value: '#subject-id' },
      parameter: '123',
      notes: '',
      source: ''
    })
  })
})
