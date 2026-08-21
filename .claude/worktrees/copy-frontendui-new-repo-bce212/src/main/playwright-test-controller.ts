import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import type { LiveTestProgressDocument } from '../authoring/live-test-progress'
import type {
  PlaywrightTestRunMode,
  PlaywrightTestRunResult
} from '../authoring/playwright-test-run-result'
import { exportPlaywright } from '../exporters/playwright-exporter'

export interface PlaywrightTestControllerOptions {
  currentDirectory: string
  createRunDirectory: (prefix: string) => Promise<string>
  removeDirectory: (path: string) => Promise<void>
  runSpec: (
    configPath: string,
    mode: PlaywrightTestRunMode
  ) => Promise<PlaywrightTestRunResult>
  writeSpec: (path: string, content: string) => Promise<void>
}

/** Runs the current export in an isolated Playwright Test process. */
export class PlaywrightTestController {
  constructor(private readonly options: PlaywrightTestControllerOptions) {}

  async run(
    document: LiveTestProgressDocument,
    mode: PlaywrightTestRunMode
  ): Promise<PlaywrightTestRunResult> {
    let directory: string | undefined
    try {
      directory = await this.options.createRunDirectory(
        join(this.options.currentDirectory, 'testgen-playwright-run-')
      )
      const specPath = join(directory, 'live-test-progress.spec.ts')
      const configPath = join(directory, 'playwright.config.ts')
      await this.options.writeSpec(specPath, exportPlaywright(document))
      await this.options.writeSpec(configPath, playwrightConfig)
      return await this.options.runSpec(configPath, mode)
    } catch (error) {
      return {
        status: 'failed',
        output: error instanceof Error ? error.message : String(error)
      }
    } finally {
      if (directory) {
        await this.options.removeDirectory(directory).catch(() => undefined)
      }
    }
  }
}

export function createPlaywrightTestController(): PlaywrightTestController {
  return new PlaywrightTestController({
    currentDirectory: process.cwd(),
    createRunDirectory: mkdtemp,
    removeDirectory: (path) => rm(path, { force: true, recursive: true }),
    runSpec: runPlaywrightSpec,
    writeSpec: writeFile
  })
}

async function runPlaywrightSpec(
  configPath: string,
  mode: PlaywrightTestRunMode
): Promise<PlaywrightTestRunResult> {
  const require = createRequire(import.meta.url)
  const cliPath = require.resolve('@playwright/test/cli')
  const command = process.env.npm_node_execpath ?? 'node'
  return new Promise((resolve) => {
    const child = spawn(
      command,
      [
        cliPath,
        'test',
        `--config=${configPath}`,
        '--reporter=line',
        '--workers=1',
        ...(mode === 'headed' ? ['--headed'] : [])
      ],
      { cwd: process.cwd(), windowsHide: true }
    )
    let output = ''
    const append = (chunk: Buffer): void => {
      output = `${output}${chunk.toString()}`.slice(-20000)
    }

    child.stdout.on('data', append)
    child.stderr.on('data', append)
    child.once('error', (error) =>
      resolve({ status: 'failed', output: error.message })
    )
    child.once('close', (code) =>
      resolve({
        status: code === 0 ? 'passed' : 'failed',
        output:
          output.trim() || `Playwright exited with code ${code ?? 'unknown'}.`
      })
    )
  })
}

const playwrightConfig = `import { defineConfig } from '@playwright/test'

export default defineConfig({ testDir: '.', testMatch: 'live-test-progress.spec.ts' })
`
