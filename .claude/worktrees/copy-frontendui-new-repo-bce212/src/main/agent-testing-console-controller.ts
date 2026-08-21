import type { BrowserExecutionAgentRunResult } from '../authoring/browser-execution-agent-run-result'
import type { BrowserExecutionCommandResult } from '../browser/browser-execution-commands'
import type { AiAuthoringController } from './ai-authoring-controller'
import type { BrowserExecutionController } from './browser-execution-controller'

export interface AgentTestingConsoleControllerOptions {
  aiAuthoringController: Pick<AiAuthoringController, 'run'>
  browserController: Pick<BrowserExecutionController, 'invoke'>
  enabled: boolean
}

/**
 * Development-only boundary for exercising the Browser Execution Agent. It
 * exposes no browser-runtime object, generic MCP tool, or test-document
 * mutation path to its renderer.
 */
export class AgentTestingConsoleController {
  private isRunning = false

  constructor(private readonly options: AgentTestingConsoleControllerOptions) {}

  getConfiguration(): { enabled: boolean } {
    return { enabled: this.options.enabled }
  }

  async captureObservation(): Promise<BrowserExecutionCommandResult> {
    if (!this.options.enabled) {
      return {
        status: 'rejected',
        message: 'The Agent Testing Console is disabled for this launch.'
      }
    }
    if (this.isRunning) {
      return {
        status: 'rejected',
        message: 'Another Agent Testing Console run is already active.'
      }
    }

    this.isRunning = true
    try {
      return await this.options.browserController.invoke({ action: 'observe' })
    } finally {
      this.isRunning = false
    }
  }

  async execute(input: unknown): Promise<BrowserExecutionAgentRunResult> {
    if (!this.options.enabled) {
      return {
        status: 'rejected',
        message: 'The Agent Testing Console is disabled for this launch.',
        callsUsed: 0
      }
    }
    if (typeof input !== 'string') {
      return {
        status: 'rejected',
        message: 'A browser task must contain text.',
        callsUsed: 0
      }
    }
    if (this.isRunning) {
      return {
        status: 'rejected',
        message: 'Another Agent Testing Console run is already active.',
        callsUsed: 0
      }
    }

    this.isRunning = true
    try {
      return await this.options.aiAuthoringController.run(input)
    } finally {
      this.isRunning = false
    }
  }
}
