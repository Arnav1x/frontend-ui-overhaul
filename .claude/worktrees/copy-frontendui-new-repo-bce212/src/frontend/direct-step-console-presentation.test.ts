import { describe, expect, it } from 'vitest'

import {
  createDirectToolRequest,
  directBrowserToolDefinitions,
  directToolResultPresentation
} from './direct-step-console-presentation'

describe('Direct Step Console presentation', () => {
  it('defines only the four approved visible tools and required inputs', () => {
    expect(directBrowserToolDefinitions).toEqual([
      { name: 'browser_snapshot', inputs: [] },
      { name: 'browser_navigate', inputs: ['url'] },
      { name: 'browser_click', inputs: ['target'] },
      { name: 'browser_type', inputs: ['target', 'text'] }
    ])
  })

  it('requires form values before creating a request', () => {
    expect(
      createDirectToolRequest('browser_navigate', {
        target: '',
        text: '',
        url: ''
      })
    ).toBeUndefined()
    expect(
      createDirectToolRequest('browser_type', {
        target: 'e1',
        text: 'value',
        url: ''
      })
    ).toEqual({ name: 'browser_type', target: 'e1', text: 'value' })
  })

  it('keeps raw latest output and errors distinct from browser availability', () => {
    expect(
      directToolResultPresentation({
        status: 'success',
        output: 'raw accessibility snapshot'
      })
    ).toEqual({
      label: 'Latest tool output',
      value: 'raw accessibility snapshot'
    })
    expect(
      directToolResultPresentation({
        status: 'failed',
        message: 'browser_click failed: target is stale'
      })
    ).toEqual({
      label: 'Latest tool error',
      value: 'browser_click failed: target is stale'
    })
  })
})
