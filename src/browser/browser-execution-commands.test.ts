import { describe, expect, it } from 'vitest'

import { parseBrowserExecutionCommand } from './browser-execution-commands'

describe('parseBrowserExecutionCommand', () => {
  it('accepts only the fixed Browser Execution Agent command shapes', () => {
    expect(parseBrowserExecutionCommand({ action: 'observe' })).toEqual({
      action: 'observe'
    })
    expect(
      parseBrowserExecutionCommand({
        action: 'navigate',
        url: 'https://example.test'
      })
    ).toEqual({ action: 'navigate', url: 'https://example.test' })
    expect(
      parseBrowserExecutionCommand({ action: 'click', target: 'e1' })
    ).toEqual({ action: 'click', target: 'e1' })
    expect(
      parseBrowserExecutionCommand({
        action: 'type',
        target: 'e2',
        text: 'hello'
      })
    ).toEqual({ action: 'type', target: 'e2', text: 'hello' })
    expect(
      parseBrowserExecutionCommand({ action: 'wait_for_page_settle' })
    ).toEqual({
      action: 'wait_for_page_settle'
    })
  })

  it('rejects direct-console and arbitrary MCP command shapes', () => {
    expect(
      parseBrowserExecutionCommand({ name: 'browser_snapshot' })
    ).toBeUndefined()
    expect(
      parseBrowserExecutionCommand({ action: 'tabs', operation: 'list' })
    ).toBeUndefined()
    expect(
      parseBrowserExecutionCommand({ action: 'click', target: '' })
    ).toBeUndefined()
    expect(
      parseBrowserExecutionCommand({
        action: 'observe',
        arbitraryArguments: {}
      })
    ).toBeUndefined()
  })
})
