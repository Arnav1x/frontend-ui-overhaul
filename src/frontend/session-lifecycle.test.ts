import { describe, expect, it } from 'vitest'

import {
  composerPresentation,
  sessionLifecycleChip,
  stoppedReasonLabel
} from './session-lifecycle'

describe('session lifecycle chip', () => {
  it('walks draft → setup complete → running → waiting → terminal states', () => {
    const base = {
      awaitingUser: false,
      running: false,
      setupComplete: false
    }

    expect(sessionLifecycleChip(base)).toEqual({
      label: 'draft',
      tone: 'neutral'
    })
    expect(sessionLifecycleChip({ ...base, setupComplete: true })).toEqual({
      label: '✓ setup complete',
      tone: 'success'
    })
    expect(sessionLifecycleChip({ ...base, running: true })).toEqual({
      label: '● task running',
      tone: 'active'
    })
    expect(sessionLifecycleChip({ ...base, awaitingUser: true })).toEqual({
      label: '⏸ waiting on you',
      tone: 'active'
    })
    expect(
      sessionLifecycleChip({ ...base, lastResultStatus: 'completed' })
    ).toEqual({ label: '✓ task complete', tone: 'success' })
    expect(
      sessionLifecycleChip({ ...base, lastResultStatus: 'stopped' })
    ).toEqual({ label: '■ stopped', tone: 'active' })
    expect(
      sessionLifecycleChip({ ...base, lastResultStatus: 'failed' })
    ).toEqual({ label: '✕ task failed', tone: 'danger' })
  })

  it('lets an active run outrank an earlier terminal result', () => {
    expect(
      sessionLifecycleChip({
        awaitingUser: false,
        lastResultStatus: 'completed',
        running: true,
        setupComplete: true
      })
    ).toEqual({ label: '● task running', tone: 'active' })
  })
})

describe('composer presentation', () => {
  const base = {
    aiAuthoringAvailable: true,
    awaitingUser: false,
    browserState: 'ready' as const,
    running: false,
    setupComplete: false
  }

  it('locks while the browser is starting or unavailable', () => {
    expect(
      composerPresentation({ ...base, browserState: 'starting' })
    ).toMatchObject({
      mode: 'locked',
      hint: 'browser starting — chat unlocks when ready'
    })
    expect(
      composerPresentation({ ...base, browserState: 'failed' })
    ).toMatchObject({
      mode: 'locked',
      hint: 'browser unavailable — restart it to continue'
    })
  })

  it('locks during a run and switches to answer mode for a clarification', () => {
    expect(composerPresentation({ ...base, running: true })).toMatchObject({
      mode: 'locked',
      hint: 'one task at a time — stop it to send another'
    })
    expect(composerPresentation({ ...base, awaitingUser: true })).toMatchObject(
      { mode: 'answer' }
    )
  })

  it('offers the state-specific invitation once idle', () => {
    expect(
      composerPresentation({ ...base, setupComplete: true })
    ).toMatchObject({
      mode: 'ready',
      hint: 'first agent task — AI calls start here'
    })
    expect(
      composerPresentation({ ...base, lastResultStatus: 'completed' })
    ).toMatchObject({
      mode: 'ready',
      hint: 'ready — the next task continues from this page'
    })
    expect(
      composerPresentation({ ...base, lastResultStatus: 'stopped' })
    ).toMatchObject({
      mode: 'ready',
      placeholder: 'Send a narrower task'
    })
  })
})

describe('stopped reason labels', () => {
  it('names each stop reason for the result tag', () => {
    expect(stoppedReasonLabel('model_finished_without_action')).toBe(
      'finished without action'
    )
    expect(stoppedReasonLabel('multiple_tool_calls_requested')).toBe(
      'multiple tool calls'
    )
    expect(stoppedReasonLabel('call_limit_reached')).toBe('call limit reached')
    expect(stoppedReasonLabel('user_requested')).toBe('stopped by you')
  })
})
