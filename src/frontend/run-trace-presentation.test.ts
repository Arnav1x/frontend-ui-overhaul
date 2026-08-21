import { describe, expect, it } from 'vitest'

import type { BrowserExecutionTraceEvent } from '../authoring/browser-execution-agent-run-result'
import { runTraceRows } from './run-trace-presentation'

const snapshot = [
  'button "Search" [ref=e41]',
  'textbox "Protocol No" [ref=e38]'
].join('\n')

describe('run trace rows', () => {
  it('renders observations with their element count and payload', () => {
    const rows = runTraceRows([
      {
        kind: 'observation',
        timing: 'initial',
        result: { status: 'success', output: snapshot },
        callsUsed: 1
      }
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      tag: 'observe',
      label: 'page snapshot · 2 elements',
      state: 'done'
    })
    expect(rows[0].detail).toEqual([
      'button "Search" [ref=e41]',
      'textbox "Protocol No" [ref=e38]'
    ])
  })

  it('keeps a requested action pending until its browser result lands', () => {
    const request: BrowserExecutionTraceEvent = {
      kind: 'tool_requested',
      action: 'click',
      input: { target: 'e41' },
      callsUsed: 2
    }

    expect(runTraceRows([request])[0]).toMatchObject({
      tag: 'click',
      label: 'ref e41',
      state: 'pending'
    })

    const rows = runTraceRows([
      request,
      {
        kind: 'selector_capture',
        target: 'e41',
        result: {
          status: 'captured',
          selector: { kind: 'css', value: '#btnSearch', strategy: 'id' },
          quality: 'stable-attribute'
        },
        callsUsed: 4
      },
      {
        kind: 'tool_result',
        action: 'click',
        result: { status: 'success', output: 'clicked Search' },
        callsUsed: 5
      }
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      state: 'done',
      selector: '#btnSearch'
    })
    expect(rows[0].detail).toEqual([
      'selector #btnSearch · id',
      'clicked Search'
    ])
  })

  it('masks a typed value once its captured selector looks credential-like', () => {
    const rows = runTraceRows([
      {
        kind: 'tool_requested',
        action: 'type',
        input: { target: 'e9', text: 'hunter2' },
        callsUsed: 2
      },
      {
        kind: 'selector_capture',
        target: 'e9',
        result: {
          status: 'captured',
          selector: { kind: 'css', value: '#txtPassword', strategy: 'id' },
          quality: 'stable-attribute'
        },
        callsUsed: 4
      }
    ])

    expect(rows[0]).toMatchObject({
      tag: 'fill',
      label: 'entered ••••',
      state: 'pending'
    })
  })

  it('marks failed commands and keeps the failure message as payload', () => {
    const rows = runTraceRows([
      {
        kind: 'tool_requested',
        action: 'navigate',
        input: { url: 'https://example.test' },
        callsUsed: 2
      },
      {
        kind: 'tool_result',
        action: 'navigate',
        result: { status: 'failed', message: 'net::ERR_NAME_NOT_RESOLVED' },
        callsUsed: 3
      }
    ])

    expect(rows[0]).toMatchObject({
      tag: 'navigate',
      label: 'https://example.test',
      state: 'failed'
    })
    expect(rows[0].detail).toEqual(['net::ERR_NAME_NOT_RESOLVED'])
  })
})
