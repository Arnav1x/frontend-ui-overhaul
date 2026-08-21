import {
  parseBrowserExecutionCommand,
  type BrowserExecutionCommandResult
} from '../browser/browser-execution-commands'
import type { BrowserSession } from '../browser/browser-session'
import type {
  BrowserTargetReference,
  SelectorCaptureResult
} from '../browser/selector-capture'
import { resolve } from 'node:path'

export interface BrowserExecutionControllerOptions {
  getBrowserSession: () => BrowserSession | undefined
}

/**
 * Main-process command boundary for the Browser Execution Agent. Its LangChain
 * tools call this controller; they never receive a direct MCP, CDP, Playwright, or
 * Electron connection.
 */
export class BrowserExecutionController {
  constructor(private readonly options: BrowserExecutionControllerOptions) {}

  async invoke(input: unknown): Promise<BrowserExecutionCommandResult> {
    const command = parseBrowserExecutionCommand(input)
    if (!command) {
      return {
        status: 'rejected',
        message:
          'The requested Browser Execution Agent command or its required inputs are invalid.'
      }
    }

    const browserSession = this.options.getBrowserSession()
    if (!browserSession) {
      return {
        status: 'failed',
        message: 'The embedded browser is unavailable.'
      }
    }

    if (command.action === 'upload_test_file') {
      return browserSession.uploadTestFile(
        resolve(process.cwd(), 'src', 'fixtures', 'test.txt')
      )
    }

    return browserSession.invokeBrowserExecutionCommand(command)
  }

  async captureSelector(
    target: BrowserTargetReference
  ): Promise<SelectorCaptureResult> {
    const browserSession = this.options.getBrowserSession()
    if (!browserSession) {
      return {
        status: 'unresolved',
        message: 'The embedded browser is unavailable.'
      }
    }

    return browserSession.captureSelector(target)
  }
}
