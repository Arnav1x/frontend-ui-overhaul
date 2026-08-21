import type { BrowserExecutionAgentRunResult } from '../authoring/browser-execution-agent-run-result'
import type { BrowserExecutionAgentRunner } from './browser-execution-agent-runner'

export interface AiAuthoringControllerOptions {
  agentRunner: Pick<BrowserExecutionAgentRunner, 'run'> &
    Partial<Pick<BrowserExecutionAgentRunner, 'continue' | 'requestStop'>>
}

/**
 * Main-process boundary for one bounded AI Authoring intent run. This is
 * deliberately separate from the development-only Direct Step Console.
 */
export class AiAuthoringController {
  private isRunning = false
  private awaitingUser = false

  constructor(private readonly options: AiAuthoringControllerOptions) {}

  canRestartSession(): boolean {
    return !this.isRunning && !this.awaitingUser
  }

  /** Asks the active run to stop at its next loop boundary. */
  stop(): void {
    if (this.isRunning) {
      this.options.agentRunner.requestStop?.()
    }
  }

  async run(input: unknown): Promise<BrowserExecutionAgentRunResult> {
    if (typeof input !== 'string') {
      return {
        status: 'rejected',
        message: 'An AI Authoring intent must contain text.',
        callsUsed: 0
      }
    }

    if (this.isRunning || this.awaitingUser) {
      return {
        status: 'rejected',
        message: 'An AI Authoring intent is already running.',
        callsUsed: 0
      }
    }

    this.isRunning = true
    try {
      const result = await this.options.agentRunner.run(input)
      this.awaitingUser = result.status === 'awaiting_user'
      return result
    } finally {
      this.isRunning = false
    }
  }

  async respond(input: unknown): Promise<BrowserExecutionAgentRunResult> {
    if (typeof input !== 'string' || !input.trim()) {
      return {
        status: 'rejected',
        message: 'A clarification response must contain text.',
        callsUsed: 0
      }
    }
    if (this.isRunning || !this.awaitingUser) {
      return {
        status: 'rejected',
        message: 'The agent is not waiting for a clarification response.',
        callsUsed: 0
      }
    }
    if (!this.options.agentRunner.continue) {
      return {
        status: 'failed',
        message: 'Agent continuation is unavailable.',
        callsUsed: 0
      }
    }
    this.isRunning = true
    try {
      const result = await this.options.agentRunner.continue(input)
      this.awaitingUser = result.status === 'awaiting_user'
      return result
    } finally {
      this.isRunning = false
    }
  }
}
