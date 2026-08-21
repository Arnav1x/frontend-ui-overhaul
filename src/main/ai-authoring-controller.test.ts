import { describe, expect, it, vi } from 'vitest'

import type { BrowserExecutionAgentRunResult } from './browser-execution-agent-runner'
import { AiAuthoringController } from './ai-authoring-controller'

const completedResult: BrowserExecutionAgentRunResult = {
  status: 'completed',
  actions: ['click'],
  output: 'Clicked the sign-in button.',
  callsUsed: 4,
  testDocument: { steps: [] }
}

describe('AiAuthoringController', () => {
  it('passes one text instruction to the runner', async () => {
    const run = vi.fn(async () => completedResult)
    const controller = new AiAuthoringController({
      agentRunner: { run }
    })

    await expect(controller.run('Select Sign in.')).resolves.toEqual(
      completedResult
    )
    expect(run).toHaveBeenCalledWith('Select Sign in.')
  })

  it('rejects non-text input before it reaches the runner', async () => {
    const run = vi.fn(async () => completedResult)
    const controller = new AiAuthoringController({
      agentRunner: { run }
    })

    await expect(
      controller.run({ instruction: 'Select Sign in.' })
    ).resolves.toEqual({
      status: 'rejected',
      message: 'An AI Authoring intent must contain text.',
      callsUsed: 0
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a second submission while the first run remains active', async () => {
    let finishRun:
      | ((result: BrowserExecutionAgentRunResult) => void)
      | undefined
    const run = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<BrowserExecutionAgentRunResult>((resolve) => {
            finishRun = resolve
          })
      )
      .mockResolvedValue(completedResult)
    const controller = new AiAuthoringController({
      agentRunner: { run }
    })

    const firstRun = controller.run('Select Sign in.')

    await expect(controller.run('Open help.')).resolves.toEqual({
      status: 'rejected',
      message: 'An AI Authoring intent is already running.',
      callsUsed: 0
    })

    finishRun?.(completedResult)
    await expect(firstRun).resolves.toEqual(completedResult)
    await expect(controller.run('Open help.')).resolves.toEqual(completedResult)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('forwards a stop request only while a run is active', async () => {
    let finishRun:
      | ((result: BrowserExecutionAgentRunResult) => void)
      | undefined
    const requestStop = vi.fn()
    const controller = new AiAuthoringController({
      agentRunner: {
        run: () =>
          new Promise<BrowserExecutionAgentRunResult>((resolve) => {
            finishRun = resolve
          }),
        requestStop
      }
    })

    controller.stop()
    expect(requestStop).not.toHaveBeenCalled()

    const result = controller.run('Select Sign in.')
    controller.stop()
    expect(requestStop).toHaveBeenCalledTimes(1)

    finishRun?.(completedResult)
    await result
  })

  it('permits Restart Session only after a terminal agent result', async () => {
    let finishRun:
      | ((result: BrowserExecutionAgentRunResult) => void)
      | undefined
    const controller = new AiAuthoringController({
      agentRunner: {
        run: () =>
          new Promise<BrowserExecutionAgentRunResult>((resolve) => {
            finishRun = resolve
          })
      }
    })

    const result = controller.run('Select Sign in.')

    expect(controller.canRestartSession()).toBe(false)

    finishRun?.(completedResult)
    await result

    expect(controller.canRestartSession()).toBe(true)
  })
})
