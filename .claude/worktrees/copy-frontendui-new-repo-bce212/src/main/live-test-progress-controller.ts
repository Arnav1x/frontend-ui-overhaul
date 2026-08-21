import {
  appendCapturedStep,
  copyLiveTestProgressDocument,
  createLiveTestProgressDocument,
  isLiveTestProgressDocument,
  type LiveTestProgressDocument
} from '../authoring/live-test-progress'
import type { IncompleteTestDocumentStep } from '../authoring/incomplete-test-document'

/** Owns the single editable document for the current application session. */
export class LiveTestProgressController {
  private document = createLiveTestProgressDocument()

  getDocument(): LiveTestProgressDocument {
    return copyLiveTestProgressDocument(this.document)
  }

  appendCapturedStep(
    step: IncompleteTestDocumentStep
  ): LiveTestProgressDocument {
    this.document = appendCapturedStep(this.document, step)
    return this.getDocument()
  }

  replaceDocument(input: unknown): LiveTestProgressDocument {
    if (!isLiveTestProgressDocument(input)) {
      throw new Error('Live Test Progress must contain editable test rows.')
    }
    this.document = copyLiveTestProgressDocument(input)
    return this.getDocument()
  }

  clearDocument(): LiveTestProgressDocument {
    this.document = createLiveTestProgressDocument()
    return this.getDocument()
  }
}
