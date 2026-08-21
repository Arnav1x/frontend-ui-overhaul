import { describe, expect, it } from 'vitest'

import {
  createIncompleteTestDocument,
  playwrightLocatorFromToolOutput
} from './incomplete-test-document'

describe('incomplete test document', () => {
  it('extracts the Playwright locator from a successful MCP click result', () => {
    expect(
      playwrightLocatorFromToolOutput(`### Ran Playwright code
\`\`\`js
await page.getByRole('link', { name: 'PPM' }).click();
\`\`\`
### Page`)
    ).toBe("page.getByRole('link', { name: 'PPM' })")
  })

  it('extracts a fill locator and leaves malformed output empty', () => {
    expect(
      playwrightLocatorFromToolOutput(`### Ran Playwright code
\`\`\`js
await page.getByLabel('User Name').fill('Hilgertkg');
\`\`\``)
    ).toBe("page.getByLabel('User Name')")
    expect(playwrightLocatorFromToolOutput('clicked')).toBe('')
  })

  it('copies steps without filling selector fields', () => {
    const document = createIncompleteTestDocument([
      {
        stepNumber: 1,
        description: '',
        action: 'click',
        selector: { kind: '', value: '', strategy: '' },
        playwrightLocator: "page.getByRole('button', { name: 'Submit' })"
      }
    ])

    expect(document).toEqual({
      steps: [
        {
          stepNumber: 1,
          description: '',
          action: 'click',
          selector: { kind: '', value: '', strategy: '' },
          playwrightLocator: "page.getByRole('button', { name: 'Submit' })"
        }
      ]
    })
  })
})
