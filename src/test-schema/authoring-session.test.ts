import { describe, expect, it } from 'vitest'

import { InMemoryAuthoringSession } from './authoring-session'
import {
  createCanonicalStep,
  createCanonicalTestDocument
} from './canonical-test-document'

describe('InMemoryAuthoringSession', () => {
  it('owns one document and appends steps in supplied order', () => {
    const session = new InMemoryAuthoringSession(
      createCanonicalTestDocument({ startingState: 'preconfigured' })
    )
    const navigate = createCanonicalStep({
      action: 'navigate',
      parameter: 'https://example.test'
    })
    const click = createCanonicalStep({
      action: 'click',
      selector: { kind: 'css', value: '#continue' }
    })

    session.appendStep(navigate)
    session.appendStep(click)

    expect(session.getDocument()).toEqual({
      startingState: 'preconfigured',
      steps: [navigate, click]
    })
  })

  it('exposes no authoring mode or workflow behavior', () => {
    const session = new InMemoryAuthoringSession(
      createCanonicalTestDocument({ startingState: 'neutral' })
    )

    expect('activeMode' in session).toBe(false)
    expect('record' in session).toBe(false)
    expect('execute' in session).toBe(false)
  })

  it('keeps ownership when the input document changes after construction', () => {
    const document = createCanonicalTestDocument({ startingState: 'neutral' })
    const session = new InMemoryAuthoringSession(document)

    document.steps.push(
      createCanonicalStep({
        action: 'navigate',
        parameter: 'https://outside-change.test'
      })
    )

    expect(session.getDocument().steps).toEqual([])
  })
})
