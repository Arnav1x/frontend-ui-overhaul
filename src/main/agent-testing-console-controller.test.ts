import { describe, expect, it, vi } from 'vitest'

import type { AiAuthoringController } from './ai-authoring-controller'
import type { BrowserExecutionController } from './browser-execution-controller'
import { AgentTestingConsoleController } from './agent-testing-console-controller'

function createController({ enabled = true }: { enabled?: boolean } = {}) {
  const invoke = vi.fn(async () => ({
    status: 'success' as const,
    output: 'snapshot'
  }))
  const run = vi.fn(async () => ({
    status: 'completed' as const,
    actions: ['click'] as const,
    output: 'clicked',
    callsUsed: 3,
    testDocument: { steps: [] }
  }))
  return {
    controller: new AgentTestingConsoleController({
      aiAuthoringController: { run } as Pick<AiAuthoringController, 'run'>,
      browserController: { invoke } as Pick<
        BrowserExecutionController,
        'invoke'
      >,
      enabled
    }),
    invoke,
    run
  }
}

describe('AgentTestingConsoleController', () => {
  it('captures the current observation only through the fixed browser-execution route', async () => {
    const { controller, invoke } = createController()

    await expect(controller.captureObservation()).resolves.toEqual({
      status: 'success',
      output: 'snapshot'
    })
    expect(invoke).toHaveBeenCalledWith({ action: 'observe' })
  })

  it('runs a complete browser task through the main execution route', async () => {
    const { controller, run } = createController()

    await expect(
      controller.execute('Enter Ada and submit the form.')
    ).resolves.toMatchObject({ status: 'completed', actions: ['click'] })
    expect(run).toHaveBeenCalledWith('Enter Ada and submit the form.')
  })

  it('rejects disabled-console requests before an agent runs', async () => {
    const { controller, run } = createController({ enabled: false })

    await expect(
      controller.execute({ instruction: 'Click Search.' })
    ).resolves.toMatchObject({ status: 'rejected' })
    expect(run).not.toHaveBeenCalled()
  })
})
