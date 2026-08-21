import { describe, expect, it } from 'vitest'

import { exportPlaywright } from './playwright-exporter'

describe('Playwright exporter', () => {
  it('writes ordered browser actions from the editable progress document', () => {
    expect(
      exportPlaywright({
        steps: [
          {
            stepNo: 8,
            description: 'Open the login page',
            action: 'navigate',
            selector: '',
            parameter: 'https://example.test/login',
            additionalParameter: '',
            comments: ''
          },
          {
            stepNo: 2,
            description: 'Enter user name',
            action: 'fillintext',
            selector: '#username',
            parameter: 'Ada "test"',
            additionalParameter: '',
            comments: 'Use a test account'
          },
          {
            stepNo: 3,
            description: '',
            action: 'click',
            selector: '#sign-in',
            parameter: '',
            additionalParameter: '',
            comments: ''
          }
        ]
      })
    ).toBe(`import { test } from '@playwright/test'

test("Untitled test", async ({ page }) => {
  // Step 1: Open the login page
  await page.goto("https://example.test/login")
  // Step 2: Enter user name
  // Comments: Use a test account
  await page.locator("#username").fill("Ada \\"test\\"")
  // Step 3: click step
  await page.locator("#sign-in").click()
})
`)
  })

  it('names the test after the session title, escaping it as a literal', () => {
    expect(exportPlaywright({ steps: [] }, `protocol "search"`)).toContain(
      `test("protocol \\"search\\"", async ({ page }) => {`
    )
    expect(exportPlaywright({ steps: [] }, '   ')).toContain(
      'test("Untitled test", async ({ page }) => {'
    )
  })

  it('stops explicitly at incomplete rows instead of inventing values', () => {
    expect(
      exportPlaywright({
        steps: [
          {
            stepNo: 1,
            description: '',
            action: 'click',
            selector: '',
            parameter: '',
            additionalParameter: '',
            comments: ''
          }
        ]
      })
    ).toContain(
      'throw new Error("Step 1 requires a CSS selector before it can run.")'
    )
  })
})
