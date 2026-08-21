export const incompleteTestDocumentActions = [
  'navigate',
  'click',
  'fill'
] as const

export type IncompleteTestDocumentAction =
  (typeof incompleteTestDocumentActions)[number]

export type IncompleteSelectorStrategy =
  | ''
  | 'id'
  | 'attribute'
  | 'link-route'
  | 'structural-fallback'

/**
 * The product-owned intermediary output gathered from one browser task. It is
 * intentionally incomplete until selector capture provides a CSS or XPath
 * value for each element action.
 */
export interface IncompleteTestDocumentStep {
  stepNumber: number
  description: string
  action: IncompleteTestDocumentAction
  selector: {
    kind: '' | 'css' | 'xpath'
    value: string
    strategy: IncompleteSelectorStrategy
  }
  playwrightLocator: string
  parameter?: string
}

export interface IncompleteTestDocument {
  steps: readonly IncompleteTestDocumentStep[]
}

export function createIncompleteTestDocument(
  steps: readonly IncompleteTestDocumentStep[]
): IncompleteTestDocument {
  return { steps: steps.map(copyStep) }
}

/** Extracts the locator/action expression emitted by Playwright MCP. */
export function playwrightLocatorFromToolOutput(output: string): string {
  const code = output
    .match(
      /### Ran Playwright code\s*```(?:js|javascript)?\s*\n([\s\S]*?)```/i
    )?.[1]
    ?.trim()
  if (!code) {
    return ''
  }

  const action = code.match(/^await\s+(.+)\.(?:click|fill)\([^\n]*\);?$/s)
  if (action) {
    return action[1].trim()
  }

  const navigation = code.match(/^await\s+(page\.goto\([^\n]*\));?$/s)
  return navigation?.[1].trim() ?? ''
}

function copyStep(
  step: IncompleteTestDocumentStep
): IncompleteTestDocumentStep {
  return { ...step, selector: { ...step.selector } }
}
