import { describe, expect, it } from 'vitest'

import { authoringModePresentation } from './authoring-mode'

describe('authoring mode presentation', () => {
  it('keeps Manual Recording and AI Authoring as distinct shell choices', () => {
    expect(authoringModePresentation.manual.label).toBe('Manual Recording')
    expect(authoringModePresentation.ai.label).toBe('AI Authoring')
    expect(authoringModePresentation.manual.unavailableMessage).not.toBe(
      authoringModePresentation.ai.unavailableMessage
    )
  })
})
