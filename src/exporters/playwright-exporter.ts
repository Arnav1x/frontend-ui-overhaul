import type {
  LiveTestProgressDocument,
  LiveTestProgressStep
} from '../authoring/live-test-progress'

export const defaultPlaywrightTestName = 'Untitled test'

/** Generates a deliberately small Playwright TypeScript test from current rows. */
export function exportPlaywright(
  document: LiveTestProgressDocument,
  testName: string = defaultPlaywrightTestName
): string {
  const lines = [
    "import { test } from '@playwright/test'",
    '',
    `test(${literal(testName.trim() || defaultPlaywrightTestName)}, async ({ page }) => {`
  ]

  document.steps.forEach((step, index) => {
    lines.push(...stepLines(step, index + 1))
  })

  lines.push('})', '')
  return lines.join('\n')
}

function stepLines(step: LiveTestProgressStep, position: number): string[] {
  const label = step.description || `${step.action} step`
  const lines = [`  // Step ${position}: ${asComment(label)}`]
  if (step.comments) lines.push(`  // Comments: ${asComment(step.comments)}`)

  switch (step.action) {
    case 'navigate':
      return step.parameter
        ? [...lines, `  await page.goto(${literal(step.parameter)})`]
        : [...lines, missing(position, 'a navigation URL in Parameter')]
    case 'click':
      return step.selector
        ? [...lines, `  await page.locator(${literal(step.selector)}).click()`]
        : [...lines, missing(position, 'a CSS selector')]
    case 'fillintext':
      if (!step.selector) {
        return [...lines, missing(position, 'a CSS selector')]
      }
      return step.parameter
        ? [
            ...lines,
            `  await page.locator(${literal(step.selector)}).fill(${literal(step.parameter)})`
          ]
        : [...lines, missing(position, 'a fill value in Parameter')]
  }
}

function missing(position: number, detail: string): string {
  return `  throw new Error(${literal(`Step ${position} requires ${detail} before it can run.`)})`
}

function literal(value: string): string {
  return JSON.stringify(value)
}

function asComment(value: string): string {
  return value.replace(/[\r\n]+/g, ' ')
}
