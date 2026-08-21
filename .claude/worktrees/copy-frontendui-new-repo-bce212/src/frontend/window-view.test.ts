import { describe, expect, it } from 'vitest'

import { getTestGenWindowView } from './window-view'

describe('TestGen window view', () => {
  it('selects a dedicated development-console view only by its window query', () => {
    expect(getTestGenWindowView('?view=direct-tools')).toBe('direct-tools')
    expect(getTestGenWindowView('?view=agent-testing-console')).toBe(
      'agent-testing-console'
    )
    expect(getTestGenWindowView('?view=live-test-progress')).toBe(
      'live-test-progress'
    )
    expect(getTestGenWindowView('')).toBe('main')
    expect(getTestGenWindowView('?view=unknown')).toBe('main')
  })
})
