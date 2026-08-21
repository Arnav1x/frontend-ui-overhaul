import { describe, expect, it, vi } from 'vitest'

import { PlaywrightTestController } from './playwright-test-controller'

describe('PlaywrightTestController', () => {
  it('writes the current export, runs it, and removes its temporary directory', async () => {
    const createRunDirectory = vi.fn(
      async () => 'C:/TestGen/testgen-playwright-run-a'
    )
    const writeSpec = vi.fn(async () => undefined)
    const runSpec = vi.fn(async () => ({
      status: 'passed' as const,
      output: '1 passed'
    }))
    const removeDirectory = vi.fn(async () => undefined)
    const controller = new PlaywrightTestController({
      currentDirectory: 'C:/TestGen',
      createRunDirectory,
      removeDirectory,
      runSpec,
      writeSpec
    })

    await expect(
      controller.run(
        {
          steps: [
            {
              stepNo: 1,
              description: '',
              action: 'navigate',
              selector: '',
              parameter: 'https://example.test',
              additionalParameter: '',
              comments: ''
            }
          ]
        },
        'headless'
      )
    ).resolves.toEqual({ status: 'passed', output: '1 passed' })

    expect(createRunDirectory).toHaveBeenCalledWith(
      'C:/TestGen/testgen-playwright-run-'
    )
    expect(writeSpec).toHaveBeenCalledWith(
      'C:/TestGen/testgen-playwright-run-a/live-test-progress.spec.ts',
      expect.stringContaining('await page.goto("https://example.test")')
    )
    expect(writeSpec).toHaveBeenCalledWith(
      'C:/TestGen/testgen-playwright-run-a/playwright.config.ts',
      expect.stringContaining("testMatch: 'live-test-progress.spec.ts'")
    )
    expect(runSpec).toHaveBeenCalledWith(
      'C:/TestGen/testgen-playwright-run-a/playwright.config.ts',
      'headless'
    )
    expect(removeDirectory).toHaveBeenCalledWith(
      'C:/TestGen/testgen-playwright-run-a'
    )
  })

  it('passes the headed mode to the Playwright runner', async () => {
    const runSpec = vi.fn(async () => ({
      status: 'passed' as const,
      output: '1 passed'
    }))
    const controller = new PlaywrightTestController({
      currentDirectory: 'C:/TestGen',
      createRunDirectory: async () => 'C:/TestGen/testgen-playwright-run-b',
      removeDirectory: async () => undefined,
      runSpec,
      writeSpec: async () => undefined
    })

    await controller.run({ steps: [] }, 'headed')

    expect(runSpec).toHaveBeenCalledWith(
      'C:/TestGen/testgen-playwright-run-b/playwright.config.ts',
      'headed'
    )
  })
})
