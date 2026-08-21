export type BrowserExecutionAction =
  | 'navigate'
  | 'click'
  | 'type'
  | 'upload_test_file'

import type { IncompleteTestDocument } from './incomplete-test-document'

/** Product-owned diagnostic facts from one bounded Browser Execution Agent run. */
export type BrowserExecutionTraceEvent =
  | {
      kind: 'observation'
      timing: 'initial' | 'after_action'
      result: {
        status: 'success' | 'rejected' | 'failed'
        output?: string
        message?: string
      }
      callsUsed: number
    }
  | {
      kind: 'tool_requested'
      action: string
      input: Record<string, unknown>
      normalizedTarget?: string
      callsUsed: number
    }
  | {
      kind: 'tool_result'
      action: string
      result: {
        status: 'success' | 'rejected' | 'failed'
        output?: string
        message?: string
      }
      callsUsed: number
    }
  | {
      kind: 'selector_capture'
      target: string
      requestedTarget?: string
      result:
        | {
            status: 'captured'
            selector: {
              kind: 'css' | 'xpath'
              value: string
              strategy:
                | 'id'
                | 'attribute'
                | 'link-route'
                | 'structural-fallback'
            }
            quality:
              | 'stable-attribute'
              | 'stable-route'
              | 'content-attribute'
              | 'structural-fallback'
          }
        | { status: 'unresolved'; message: string; rawOutput?: string }
      callsUsed: number
    }

export type BrowserExecutionAgentRunResult =
  | {
      status: 'completed'
      /** Every successful user-visible action completed during this bounded run. */
      actions: readonly BrowserExecutionAction[]
      output: string
      callsUsed: number
      /** Incomplete intermediary output; selectors are blank until capture exists. */
      testDocument: IncompleteTestDocument
      trace?: readonly BrowserExecutionTraceEvent[]
    }
  | {
      status: 'awaiting_user'
      question: string
      callsUsed: number
      trace?: readonly BrowserExecutionTraceEvent[]
    }
  | {
      status: 'stopped'
      reason:
        | 'call_limit_reached'
        | 'model_finished_without_action'
        | 'multiple_tool_calls_requested'
        | 'user_requested'
      callsUsed: number
      message?: string
      trace?: readonly BrowserExecutionTraceEvent[]
    }
  | {
      status: 'rejected'
      message: string
      callsUsed: 0
      trace?: readonly BrowserExecutionTraceEvent[]
    }
  | {
      status: 'failed'
      message: string
      callsUsed: number
      trace?: readonly BrowserExecutionTraceEvent[]
    }
