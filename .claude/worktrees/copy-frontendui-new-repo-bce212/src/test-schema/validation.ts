import {
  canonicalActions,
  selectorKinds,
  startingStates,
  stepSources,
  type CanonicalSelector,
  type CanonicalStep,
  type CanonicalTestDocument
} from './canonical-test-document'

export interface StructuralValidationIssue {
  path: string
  message: string
}

export function validateCanonicalStep(
  step: unknown
): StructuralValidationIssue[] {
  if (!isRecord(step)) {
    return [issue('', 'must be an object')]
  }

  const issues: StructuralValidationIssue[] = []
  if (!isOneOf(step.action, canonicalActions)) {
    issues.push(issue('action', 'must be navigate, click, or fill'))
  }
  if (
    step.semanticDescription !== undefined &&
    typeof step.semanticDescription !== 'string'
  ) {
    issues.push(issue('semanticDescription', 'must be a string when provided'))
  }
  if (step.selector !== undefined && !isCanonicalSelector(step.selector)) {
    issues.push(issue('selector', 'must contain a CSS or XPath selector'))
  }
  if (step.parameter !== undefined && typeof step.parameter !== 'string') {
    issues.push(issue('parameter', 'must be a string when provided'))
  }
  if (typeof step.notes !== 'string') {
    issues.push(issue('notes', 'must be a string'))
  }
  if (!isOneOf(step.source, stepSources)) {
    issues.push(issue('source', 'must be an allowed source'))
  }

  switch (step.action) {
    case 'navigate':
      if (typeof step.parameter !== 'string') {
        issues.push(issue('parameter', 'is required for navigate'))
      }
      if (step.selector !== undefined) {
        issues.push(issue('selector', 'is not used by navigate'))
      }
      break
    case 'click':
      if (!isCanonicalSelector(step.selector)) {
        issues.push(issue('selector', 'is required for click'))
      }
      if (step.parameter !== undefined) {
        issues.push(issue('parameter', 'is not used by click'))
      }
      break
    case 'fill':
      if (!isCanonicalSelector(step.selector)) {
        issues.push(issue('selector', 'is required for fill'))
      }
      if (typeof step.parameter !== 'string') {
        issues.push(issue('parameter', 'is required for fill'))
      }
      break
  }

  return issues
}

export function validateCanonicalTestDocument(
  document: unknown
): StructuralValidationIssue[] {
  if (!isRecord(document)) {
    return [issue('', 'must be an object')]
  }

  const issues: StructuralValidationIssue[] = []
  if (!isOneOf(document.startingState, startingStates)) {
    issues.push(issue('startingState', 'must be neutral or preconfigured'))
  }
  if (
    document.startingStateNotes !== undefined &&
    typeof document.startingStateNotes !== 'string'
  ) {
    issues.push(issue('startingStateNotes', 'must be a string when provided'))
  }
  if (!Array.isArray(document.steps)) {
    issues.push(issue('steps', 'must be an array'))
  } else {
    document.steps.forEach((step, index) => {
      for (const stepIssue of validateCanonicalStep(step)) {
        issues.push(
          issue(
            `steps[${index}]${withSeparator(stepIssue.path)}`,
            stepIssue.message
          )
        )
      }
    })
  }

  return issues
}

export function isCanonicalStep(step: unknown): step is CanonicalStep {
  return validateCanonicalStep(step).length === 0
}

export function isCanonicalTestDocument(
  document: unknown
): document is CanonicalTestDocument {
  return validateCanonicalTestDocument(document).length === 0
}

function isCanonicalSelector(selector: unknown): selector is CanonicalSelector {
  return (
    isRecord(selector) &&
    isOneOf(selector.kind, selectorKinds) &&
    typeof selector.value === 'string'
  )
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  values: T
): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function issue(path: string, message: string): StructuralValidationIssue {
  return { path, message }
}

function withSeparator(path: string): string {
  return path ? `.${path}` : ''
}
