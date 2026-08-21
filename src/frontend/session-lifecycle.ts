import type { BrowserExecutionAgentRunResult } from '../authoring/browser-execution-agent-run-result'
import type { BrowserSessionState } from '../browser/browser-session'

export type StatusTone = 'neutral' | 'success' | 'active' | 'danger' | 'accent'

export interface SessionLifecycleInput {
  running: boolean
  awaitingUser: boolean
  setupComplete: boolean
  lastResultStatus?: BrowserExecutionAgentRunResult['status']
}

export interface SessionLifecycleChip {
  label: string
  tone: StatusTone
}

/** The single lifecycle chip shown next to the session title. */
export function sessionLifecycleChip(
  input: SessionLifecycleInput
): SessionLifecycleChip {
  if (input.running) {
    return { label: '● task running', tone: 'active' }
  }
  if (input.awaitingUser) {
    return { label: '⏸ waiting on you', tone: 'active' }
  }
  switch (input.lastResultStatus) {
    case 'completed':
      return { label: '✓ task complete', tone: 'success' }
    case 'stopped':
      return { label: '■ stopped', tone: 'active' }
    case 'failed':
      return { label: '✕ task failed', tone: 'danger' }
    default:
      break
  }
  if (input.setupComplete) {
    return { label: '✓ setup complete', tone: 'success' }
  }
  return { label: 'draft', tone: 'neutral' }
}

export type ComposerMode = 'locked' | 'answer' | 'ready'

export interface ComposerPresentation {
  mode: ComposerMode
  placeholder: string
  hint: string
}

export interface ComposerPresentationInput extends SessionLifecycleInput {
  aiAuthoringAvailable: boolean
  browserState: BrowserSessionState
}

/** Composer state plus the one-line hint under it, per the overhaul frames. */
export function composerPresentation(
  input: ComposerPresentationInput
): ComposerPresentation {
  if (!input.aiAuthoringAvailable) {
    return {
      mode: 'locked',
      placeholder: 'AI Authoring unavailable',
      hint: 'the secure Electron bridge is unavailable'
    }
  }
  if (input.browserState === 'starting') {
    return {
      mode: 'locked',
      placeholder: 'Send a task',
      hint: 'browser starting — chat unlocks when ready'
    }
  }
  if (input.browserState === 'failed' || input.browserState === 'closed') {
    return {
      mode: 'locked',
      placeholder: 'Browser unavailable…',
      hint: 'browser unavailable — restart it to continue'
    }
  }
  if (input.running) {
    return {
      mode: 'locked',
      placeholder: 'Waiting for the current task…',
      hint: 'one task at a time — stop it to send another'
    }
  }
  if (input.awaitingUser) {
    return {
      mode: 'answer',
      placeholder: 'Answer the question to continue',
      hint: 'Continue resumes this same run with a refreshed observation — one clarification per run, and a new task can’t start until you answer.'
    }
  }
  if (input.lastResultStatus === 'stopped') {
    return {
      mode: 'ready',
      placeholder: 'Send a narrower task',
      hint: 'steps so far are kept — continue with a smaller task'
    }
  }
  if (input.lastResultStatus === 'completed') {
    return {
      mode: 'ready',
      placeholder: 'Send a task',
      hint: 'ready — the next task continues from this page'
    }
  }
  if (input.setupComplete && input.lastResultStatus === undefined) {
    return {
      mode: 'ready',
      placeholder: 'Send a task',
      hint: 'first agent task — AI calls start here'
    }
  }
  return {
    mode: 'ready',
    placeholder: 'Send a task',
    hint: 'Enter to send · Shift+Enter for a new line'
  }
}

export function stoppedReasonLabel(
  reason: Extract<
    BrowserExecutionAgentRunResult,
    { status: 'stopped' }
  >['reason']
): string {
  switch (reason) {
    case 'call_limit_reached':
      return 'call limit reached'
    case 'model_finished_without_action':
      return 'finished without action'
    case 'multiple_tool_calls_requested':
      return 'multiple tool calls'
    case 'user_requested':
      return 'stopped by you'
  }
}
