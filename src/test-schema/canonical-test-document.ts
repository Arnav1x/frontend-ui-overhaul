export const canonicalActions = ['navigate', 'click', 'fill'] as const

export type CanonicalAction = (typeof canonicalActions)[number]

export const selectorKinds = ['css', 'xpath'] as const

export type SelectorKind = (typeof selectorKinds)[number]

export interface CanonicalSelector {
  kind: SelectorKind
  value: string
}

export const stepSources = ['', 'manual', 'planner', 'direct'] as const

export type StepSource = (typeof stepSources)[number]

export interface CanonicalStep {
  semanticDescription?: string
  action: CanonicalAction
  selector?: CanonicalSelector
  parameter?: string
  notes: string
  source: StepSource
}

export interface CanonicalStepInput {
  semanticDescription?: string
  action: CanonicalAction
  selector?: CanonicalSelector
  parameter?: string
}

export const startingStates = ['neutral', 'preconfigured'] as const

export type StartingState = (typeof startingStates)[number]

export interface CanonicalTestDocument {
  startingState: StartingState
  startingStateNotes?: string
  steps: CanonicalStep[]
}

export interface CanonicalStepSnapshot {
  readonly semanticDescription?: string
  readonly action: CanonicalAction
  readonly selector?: Readonly<CanonicalSelector>
  readonly parameter?: string
  readonly notes: string
  readonly source: StepSource
}

export interface CanonicalTestDocumentSnapshot {
  readonly startingState: StartingState
  readonly startingStateNotes?: string
  readonly steps: readonly CanonicalStepSnapshot[]
}

export interface CanonicalTestDocumentInput {
  startingState: StartingState
  startingStateNotes?: string
}

export function createCanonicalStep(input: CanonicalStepInput): CanonicalStep {
  return {
    ...input,
    notes: '',
    source: ''
  }
}

export function createCanonicalTestDocument(
  input: CanonicalTestDocumentInput
): CanonicalTestDocument {
  return {
    ...input,
    steps: []
  }
}
