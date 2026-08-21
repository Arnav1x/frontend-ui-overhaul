import { describe, expect, it } from 'vitest'

import { parseDirectBrowserToolRequest } from './direct-browser-tools'

describe('parseDirectBrowserToolRequest', () => {
  it('accepts only the four fixed request shapes', () => {
    expect(parseDirectBrowserToolRequest({ name: 'browser_snapshot' })).toEqual(
      { name: 'browser_snapshot' }
    )
    expect(
      parseDirectBrowserToolRequest({
        name: 'browser_navigate',
        url: 'https://example.test'
      })
    ).toEqual({ name: 'browser_navigate', url: 'https://example.test' })
    expect(
      parseDirectBrowserToolRequest({ name: 'browser_click', target: 'e1' })
    ).toEqual({ name: 'browser_click', target: 'e1' })
    expect(
      parseDirectBrowserToolRequest({
        name: 'browser_type',
        target: 'e2',
        text: 'hello'
      })
    ).toEqual({ name: 'browser_type', target: 'e2', text: 'hello' })
  })

  it('rejects malformed, empty, and extended request objects', () => {
    expect(
      parseDirectBrowserToolRequest({ name: 'browser_tabs' })
    ).toBeUndefined()
    expect(
      parseDirectBrowserToolRequest({ name: 'browser_click', target: '' })
    ).toBeUndefined()
    expect(
      parseDirectBrowserToolRequest({
        name: 'browser_snapshot',
        arbitraryArguments: {}
      })
    ).toBeUndefined()
    expect(parseDirectBrowserToolRequest(null)).toBeUndefined()
  })
})
