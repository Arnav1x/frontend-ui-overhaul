import type { BrowserExecutionTraceEvent } from '../authoring/browser-execution-agent-run-result'

export type RunTraceTag =
  | 'observe'
  | 'navigate'
  | 'click'
  | 'fill'
  | 'wait'
  | 'upload'
  | 'tool'

export interface RunTraceRow {
  id: number
  tag: RunTraceTag
  label: string
  state: 'pending' | 'done' | 'failed'
  /** Raw payload lines revealed when the row is expanded. */
  detail: readonly string[]
  /** CSS/XPath value once selector capture confirms one for this action. */
  selector?: string
}

const detailLineLimit = 24

/**
 * Folds the streamed agent trace into one display row per loop turn:
 * observations stand alone, while a tool request stays pending until its
 * selector capture and browser result arrive.
 */
export function runTraceRows(
  events: readonly BrowserExecutionTraceEvent[]
): RunTraceRow[] {
  const rows: RunTraceRow[] = []
  let openRow:
    | (RunTraceRow & { detail: string[]; sensitive?: boolean })
    | undefined

  for (const event of events) {
    switch (event.kind) {
      case 'observation': {
        openRow = undefined
        const output = event.result.output ?? ''
        const failed = event.result.status !== 'success'
        rows.push({
          id: rows.length,
          tag: 'observe',
          label: failed
            ? (event.result.message ?? 'observation failed')
            : observationLabel(event.timing, output),
          state: failed ? 'failed' : 'done',
          detail: failed
            ? compactLines(event.result.message ?? '')
            : compactLines(output)
        })
        break
      }
      case 'tool_requested': {
        const row = {
          id: rows.length,
          tag: traceTag(event.action),
          label: requestLabel(event.action, event.input),
          state: 'pending' as const,
          detail: [] as string[],
          sensitive: false
        }
        rows.push(row)
        openRow = row
        break
      }
      case 'selector_capture': {
        if (!openRow) {
          break
        }
        if (event.result.status === 'captured') {
          openRow.selector = event.result.selector.value
          openRow.detail.push(
            `selector ${event.result.selector.value} · ${event.result.selector.strategy}`
          )
          if (
            openRow.tag === 'fill' &&
            isSensitiveText(event.result.selector.value)
          ) {
            openRow.sensitive = true
            openRow.label = 'entered ••••'
          }
        } else {
          openRow.detail.push(`selector unresolved — ${event.result.message}`)
        }
        break
      }
      case 'tool_result': {
        if (!openRow || traceTag(event.action) !== openRow.tag) {
          break
        }
        const failed = event.result.status !== 'success'
        openRow.state = failed ? 'failed' : 'done'
        openRow.detail.push(
          ...compactLines(
            failed
              ? (event.result.message ?? 'the browser command failed')
              : (event.result.output ?? '')
          )
        )
        if (openRow.tag === 'observe' && !failed) {
          openRow.label = observationLabel(
            'after_action',
            event.result.output ?? ''
          )
        }
        openRow = undefined
        break
      }
    }
  }

  return rows
}

function observationLabel(
  timing: 'initial' | 'after_action',
  output: string
): string {
  const referenceCount = output.match(/\[ref=/g)?.length ?? 0
  const suffix = referenceCount > 0 ? ` · ${referenceCount} elements` : ''
  return timing === 'initial'
    ? `page snapshot${suffix}`
    : `re-observed${suffix}`
}

function requestLabel(action: string, input: Record<string, unknown>): string {
  switch (action) {
    case 'navigate':
      return typeof input.url === 'string' ? input.url : 'navigate'
    case 'click':
      return typeof input.target === 'string' ? `ref ${input.target}` : 'click'
    case 'type':
      return typeof input.text === 'string' ? `entered ${input.text}` : 'fill'
    case 'wait_for_page_settle':
      return 'waiting for the page to settle'
    case 'upload_test_file':
      return 'uploading test.txt'
    default:
      return action
  }
}

function traceTag(action: string): RunTraceTag {
  switch (action) {
    case 'observe':
      return 'observe'
    case 'navigate':
      return 'navigate'
    case 'click':
      return 'click'
    case 'type':
      return 'fill'
    case 'wait_for_page_settle':
      return 'wait'
    case 'upload_test_file':
      return 'upload'
    default:
      return 'tool'
  }
}

function compactLines(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
  if (lines.length <= detailLineLimit) {
    return lines
  }
  return [
    ...lines.slice(0, detailLineLimit),
    `+ ${lines.length - detailLineLimit} more`
  ]
}

export function isSensitiveText(value: string): boolean {
  return /password|passwd|pwd|passcode|secret/i.test(value)
}
