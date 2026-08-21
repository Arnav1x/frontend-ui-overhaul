import { describe, expect, it } from 'vitest'

import {
  createCanonicalStep,
  createCanonicalTestDocument
} from './canonical-test-document'
import {
  isCanonicalTestDocument,
  validateCanonicalStep,
  validateCanonicalTestDocument
} from './validation'

describe('canonical structural validation', () => {
  it('accepts the action-specific fields for navigate, click, and fill', () => {
    const document = createCanonicalTestDocument({ startingState: 'neutral' })
    document.steps.push(
      createCanonicalStep({
        action: 'navigate',
        parameter: 'https://example.test'
      }),
      createCanonicalStep({
        action: 'click',
        selector: { kind: 'xpath', value: "//button[.='Continue']" }
      }),
      createCanonicalStep({
        action: 'fill',
        selector: { kind: 'css', value: '#name' },
        parameter: 'Ada'
      })
    )

    expect(validateCanonicalTestDocument(document)).toEqual([])
    expect(isCanonicalTestDocument(document)).toBe(true)
  })

  it('rejects action fields that are missing or used by the wrong action', () => {
    expect(
      validateCanonicalStep({
        action: 'click',
        parameter: 'unexpected',
        notes: '',
        source: ''
      }).map(({ path }) => path)
    ).toEqual(['selector', 'parameter'])
    expect(
      validateCanonicalStep({
        action: 'navigate',
        selector: { kind: 'css', value: '#unexpected' },
        notes: '',
        source: ''
      }).map(({ path }) => path)
    ).toEqual(['parameter', 'selector'])
  })

  it('reports malformed document fields without assigning completeness', () => {
    const issues = validateCanonicalTestDocument({
      startingState: 'ready',
      startingStateNotes: 1,
      steps: [{ action: 'fill' }]
    })

    expect(issues.map(({ path }) => path)).toEqual([
      'startingState',
      'startingStateNotes',
      'steps[0].notes',
      'steps[0].source',
      'steps[0].selector',
      'steps[0].parameter'
    ])
  })
})
