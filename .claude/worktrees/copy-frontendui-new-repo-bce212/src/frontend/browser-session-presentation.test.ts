import { describe, expect, it } from 'vitest'

import { browserSessionPresentation } from './browser-session-presentation'

describe('browser session presentation', () => {
  it('keeps browser availability distinct from future authoring state', () => {
    expect(browserSessionPresentation({ state: 'ready' })).toBe(
      'Embedded browser ready'
    )
    expect(
      browserSessionPresentation({ state: 'failed', detail: 'CDP unavailable' })
    ).toBe('Embedded browser unavailable: CDP unavailable')
  })
})
