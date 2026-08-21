import type { BrowserExecutionAgentRunResult } from '../authoring/browser-execution-agent-run-result'

export function aiAuthoringRunPresentation(
  result: BrowserExecutionAgentRunResult | undefined,
  isRunning: boolean
): string {
  if (isRunning) {
    return 'AI Authoring is executing the intent.'
  }

  if (!result) {
    return 'No AI Authoring intent has run.'
  }

  switch (result.status) {
    case 'completed':
      return `Completed ${result.actions.length} browser action${result.actions.length === 1 ? '' : 's'} after ${result.callsUsed} calls.`
    case 'stopped':
      return `Stopped: ${stoppedMessage(result.reason)} (${result.callsUsed} calls).`
    case 'awaiting_user':
      return `Waiting for clarification: ${result.question}`
    case 'rejected':
    case 'failed':
      return result.message
  }
}

export function aiAuthoringResultDetail(
  result: BrowserExecutionAgentRunResult | undefined
): string | undefined {
  if (!result) {
    return undefined
  }

  if (result.status === 'completed') {
    return result.output
  }

  if (result.status === 'awaiting_user') {
    return result.question
  }

  return result.message
}

function stoppedMessage(
  reason: Extract<
    BrowserExecutionAgentRunResult,
    { status: 'stopped' }
  >['reason']
): string {
  switch (reason) {
    case 'call_limit_reached':
      return 'the configured call limit was reached'
    case 'model_finished_without_action':
      return 'the model finished without executing an action'
    case 'multiple_tool_calls_requested':
      return 'the model requested multiple browser tools'
  }
}
