export type AuthoringMode = 'manual' | 'ai'

export interface AuthoringModePresentation {
  label: string
  description: string
  unavailableMessage: string
}

export const authoringModePresentation: Record<
  AuthoringMode,
  AuthoringModePresentation
> = {
  manual: {
    label: 'Manual Recording',
    description: 'Capture tester-driven browser actions in a future milestone.',
    unavailableMessage:
      'Manual recording is not available in this product shell yet.'
  },
  ai: {
    label: 'AI Authoring',
    description: 'Complete one bounded plain-language browser task at a time.',
    unavailableMessage: 'Enter a browser task for AI Authoring to execute.'
  }
}
