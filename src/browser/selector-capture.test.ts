import { describe, expect, it } from 'vitest'

import {
  parseSelectorCaptureOutput,
  selectorCaptureFunction
} from './selector-capture'

describe('selector capture', () => {
  it('accepts a validated CSS result from the fixed page evaluation', () => {
    expect(
      parseSelectorCaptureOutput(`### Evaluation result
\`\`\`json
{
  "status": "captured",
  "selector": { "kind": "css", "value": "#submit", "strategy": "id" },
  "quality": "stable-attribute"
}
\`\`\``)
    ).toEqual({
      status: 'captured',
      selector: { kind: 'css', value: '#submit', strategy: 'id' },
      quality: 'stable-attribute'
    })
  })

  it('rejects malformed MCP output instead of fabricating a selector', () => {
    expect(parseSelectorCaptureOutput('browser_evaluate output')).toEqual({
      status: 'unresolved',
      message: 'Playwright MCP did not return a selector-capture result.',
      rawOutput: 'browser_evaluate output'
    })
  })

  it('accepts Playwright MCP result-body JSON without a code fence', () => {
    const output = [
      '### Result',
      '{',
      '  "status": "captured",',
      '  "selector": {',
      '    "kind": "css",',
      '    "value": "#ContentPlaceHolderTop_alternate_login_link",',
      '    "strategy": "id"',
      '  },',
      '  "quality": "stable-attribute"',
      '}',
      '### Ran Playwright code',
      '```js',
      "await page.getByRole('link', { name: 'here' }).evaluate(...);",
      '```'
    ].join('\n')

    expect(parseSelectorCaptureOutput(output)).toEqual({
      status: 'captured',
      selector: {
        kind: 'css',
        value: '#ContentPlaceHolderTop_alternate_login_link',
        strategy: 'id'
      },
      quality: 'stable-attribute'
    })
  })

  it('keeps selector generation and exact-target validation inside the fixed function', () => {
    expect(selectorCaptureFunction).toContain('document.querySelectorAll')
    expect(selectorCaptureFunction).toContain('matches[0] === element')
    expect(selectorCaptureFunction).toContain("'data-testid'")
    expect(selectorCaptureFunction).toContain(
      "attributeSelector(tag, 'href$', route)"
    )
    expect(selectorCaptureFunction).toContain("'stable-route'")
    expect(selectorCaptureFunction).toContain("'content-attribute'")
    expect(selectorCaptureFunction).toContain("'link-route'")
  })
})
