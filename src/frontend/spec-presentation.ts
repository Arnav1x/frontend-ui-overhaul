import type { LiveTestProgressStep } from '../authoring/live-test-progress'
import { isSensitiveText } from './run-trace-presentation'

/**
 * One rendered line of the in-panel spec view. Editable fields are exposed so
 * the view can host inline inputs; the export itself always uses raw values.
 */
export type SpecStepLine =
  | { kind: 'navigate'; url: string }
  | { kind: 'click'; selector: string }
  | { kind: 'fill'; selector: string; value: string; masked: boolean }
  | { kind: 'error'; message: string }

/** Mirrors the Playwright exporter's explicit-error behaviour for gaps. */
export function specStepLine(
  step: LiveTestProgressStep,
  position: number
): SpecStepLine {
  switch (step.action) {
    case 'navigate':
      return step.parameter
        ? { kind: 'navigate', url: step.parameter }
        : missing(position, 'a navigation URL in Parameter')
    case 'click':
      return step.selector
        ? { kind: 'click', selector: step.selector }
        : missing(position, 'a CSS selector')
    case 'fillintext':
      if (!step.selector) {
        return missing(position, 'a CSS selector')
      }
      return step.parameter
        ? {
            kind: 'fill',
            selector: step.selector,
            value: step.parameter,
            masked: isSensitiveStep(step)
          }
        : missing(position, 'a fill value in Parameter')
  }
}

function missing(position: number, detail: string): SpecStepLine {
  return {
    kind: 'error',
    message: `Step ${position} requires ${detail} before it can run.`
  }
}

export function isSensitiveStep(step: LiveTestProgressStep): boolean {
  return (
    step.action === 'fillintext' &&
    isSensitiveText(`${step.selector} ${step.description}`)
  )
}

export interface StepSummary {
  tag: 'navigate' | 'click' | 'fill'
  text: string
}

/** Compact per-step row for the terminal chat summary (11c-2). */
export function stepSummary(step: LiveTestProgressStep): StepSummary {
  switch (step.action) {
    case 'navigate':
      return {
        tag: 'navigate',
        text: step.description || step.parameter || 'navigate'
      }
    case 'click':
      return {
        tag: 'click',
        text: step.description || step.selector || 'click'
      }
    case 'fillintext':
      return {
        tag: 'fill',
        text: `entered ${isSensitiveStep(step) ? '••••' : step.parameter || '…'}`
      }
  }
}

export interface DocumentStatusInput {
  stepCount: number
  setupStepCount: number
  running: boolean
  awaitingUser: boolean
  lastTaskStepCount?: number
}

/** The honest step counter beside the code-panel header. */
export function documentStatusLine(input: DocumentStatusInput): string {
  if (input.stepCount === 0) {
    return '0 lines'
  }
  const count = `${input.stepCount} step${input.stepCount === 1 ? '' : 's'}`
  if (input.running) {
    return `${count} · appending`
  }
  if (input.awaitingUser) {
    return `${count} · nothing appending`
  }
  if (input.lastTaskStepCount !== undefined && input.lastTaskStepCount > 0) {
    return `${count} · ${input.lastTaskStepCount} added by this task`
  }
  if (input.setupStepCount >= input.stepCount) {
    return `${count} · all setup`
  }
  return count
}
