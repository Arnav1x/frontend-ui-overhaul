import {
  parseDirectBrowserToolRequest,
  type DirectBrowserToolResult
} from '../browser/direct-browser-tools'
import type { BrowserSession } from '../browser/browser-session'

export interface DirectToolControllerOptions {
  enabled: boolean
  getBrowserSession: () => BrowserSession | undefined
}

/**
 * Main-process boundary for the development console. It validates all
 * renderer data before the product-owned browser session receives it.
 */
export class DirectToolController {
  constructor(private readonly options: DirectToolControllerOptions) {}

  getConfiguration(): { enabled: boolean } {
    return { enabled: this.options.enabled }
  }

  async invoke(input: unknown): Promise<DirectBrowserToolResult> {
    if (!this.options.enabled) {
      return {
        status: 'rejected',
        message: 'The Direct Step Console is disabled for this launch.'
      }
    }

    const request = parseDirectBrowserToolRequest(input)
    if (!request) {
      return {
        status: 'rejected',
        message:
          'The requested browser tool or its required inputs are invalid.'
      }
    }

    const browserSession = this.options.getBrowserSession()
    if (!browserSession) {
      return {
        status: 'failed',
        message: 'The embedded browser is unavailable.'
      }
    }

    return browserSession.invokeDirectTool(request)
  }
}
