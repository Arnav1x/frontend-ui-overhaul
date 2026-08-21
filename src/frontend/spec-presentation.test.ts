import { describe, expect, it } from 'vitest'

import type { LiveTestProgressStep } from '../authoring/live-test-progress'
import {
  documentStatusLine,
  isSensitiveStep,
  specStepLine,
  stepSummary
} from './spec-presentation'

function step(overrides: Partial<LiveTestProgressStep>): LiveTestProgressStep {
  return {
    stepNo: 1,
    description: '',
    action: 'click',
    selector: '#target',
    parameter: '',
    additionalParameter: '',
    comments: '',
    ...overrides
  }
}

describe('spec step lines', () => {
  it('renders each complete action as its Playwright call', () => {
    expect(
      specStepLine(
        step({ action: 'navigate', parameter: 'https://example.test' }),
        1
      )
    ).toEqual({ kind: 'navigate', url: 'https://example.test' })
    expect(specStepLine(step({ action: 'click' }), 2)).toEqual({
      kind: 'click',
      selector: '#target'
    })
    expect(
      specStepLine(step({ action: 'fillintext', parameter: '25-I-0043' }), 3)
    ).toEqual({
      kind: 'fill',
      selector: '#target',
      value: '25-I-0043',
      masked: false
    })
  })

  it('mirrors the exporter and surfaces gaps as explicit errors', () => {
    expect(specStepLine(step({ selector: '' }), 4)).toEqual({
      kind: 'error',
      message: 'Step 4 requires a CSS selector before it can run.'
    })
    expect(
      specStepLine(step({ action: 'navigate', parameter: '' }), 5)
    ).toEqual({
      kind: 'error',
      message:
        'Step 5 requires a navigation URL in Parameter before it can run.'
    })
  })

  it('masks credential-like fill values in rendered views only', () => {
    const passwordStep = step({
      action: 'fillintext',
      selector: '#txtPassword',
      parameter: 'hunter2'
    })
    expect(isSensitiveStep(passwordStep)).toBe(true)
    expect(specStepLine(passwordStep, 1)).toMatchObject({
      kind: 'fill',
      masked: true,
      value: 'hunter2'
    })
    expect(stepSummary(passwordStep)).toEqual({
      tag: 'fill',
      text: 'entered ••••'
    })
    expect(
      stepSummary(step({ action: 'fillintext', parameter: '25-I-0043' }))
    ).toEqual({ tag: 'fill', text: 'entered 25-I-0043' })
  })
})

describe('document status line', () => {
  const base = {
    awaitingUser: false,
    running: false,
    setupStepCount: 0,
    stepCount: 0
  }

  it('narrates the document state beside the panel header', () => {
    expect(documentStatusLine(base)).toBe('0 lines')
    expect(
      documentStatusLine({ ...base, setupStepCount: 4, stepCount: 4 })
    ).toBe('4 steps · all setup')
    expect(documentStatusLine({ ...base, running: true, stepCount: 7 })).toBe(
      '7 steps · appending'
    )
    expect(
      documentStatusLine({ ...base, awaitingUser: true, stepCount: 7 })
    ).toBe('7 steps · nothing appending')
    expect(
      documentStatusLine({
        ...base,
        lastTaskStepCount: 5,
        setupStepCount: 4,
        stepCount: 9
      })
    ).toBe('9 steps · 5 added by this task')
  })
})
