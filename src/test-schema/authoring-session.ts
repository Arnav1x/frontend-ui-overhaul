import type {
  CanonicalStep,
  CanonicalTestDocument,
  CanonicalTestDocumentSnapshot
} from './canonical-test-document'

/**
 * Mode-neutral, in-memory owner of one canonical document and its step order.
 */
export class InMemoryAuthoringSession {
  private readonly document: CanonicalTestDocument

  constructor(document: CanonicalTestDocument) {
    this.document = copyDocument(document)
  }

  getDocument(): CanonicalTestDocumentSnapshot {
    return copyDocument(this.document)
  }

  appendStep(step: CanonicalStep): void {
    this.document.steps.push(step)
  }
}

function copyDocument(document: CanonicalTestDocument): CanonicalTestDocument {
  return {
    ...document,
    steps: document.steps.map((step) => ({
      ...step,
      ...(step.selector && { selector: { ...step.selector } })
    }))
  }
}
