import type { IncompleteTestDocumentStep } from './incomplete-test-document'

export type LiveTestProgressAction = 'navigate' | 'click' | 'fillintext'

export interface LiveTestProgressStep {
  stepNo: number
  description: string
  action: LiveTestProgressAction
  selector: string
  parameter: string
  additionalParameter: string
  comments: string
}

export interface LiveTestProgressDocument {
  steps: readonly LiveTestProgressStep[]
}

export function createLiveTestProgressDocument(): LiveTestProgressDocument {
  return { steps: [] }
}

export function appendCapturedStep(
  document: LiveTestProgressDocument,
  step: IncompleteTestDocumentStep
): LiveTestProgressDocument {
  return {
    steps: [
      ...document.steps.map(copyStep),
      {
        stepNo: document.steps.length + 1,
        description: step.description,
        action: step.action === 'fill' ? 'fillintext' : step.action,
        selector: step.selector.value,
        parameter: step.parameter ?? '',
        additionalParameter: '',
        comments: ''
      }
    ]
  }
}

export function copyLiveTestProgressDocument(
  document: LiveTestProgressDocument
): LiveTestProgressDocument {
  return { steps: document.steps.map(copyStep) }
}

export function isLiveTestProgressDocument(
  value: unknown
): value is LiveTestProgressDocument {
  if (!isRecord(value) || !Array.isArray(value.steps)) return false
  return value.steps.every(isLiveTestProgressStep)
}

function copyStep(step: LiveTestProgressStep): LiveTestProgressStep {
  return { ...step }
}

function isLiveTestProgressStep(value: unknown): value is LiveTestProgressStep {
  if (!isRecord(value)) return false
  return (
    typeof value.stepNo === 'number' &&
    typeof value.description === 'string' &&
    (value.action === 'navigate' ||
      value.action === 'click' ||
      value.action === 'fillintext') &&
    typeof value.selector === 'string' &&
    typeof value.parameter === 'string' &&
    typeof value.additionalParameter === 'string' &&
    typeof value.comments === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
