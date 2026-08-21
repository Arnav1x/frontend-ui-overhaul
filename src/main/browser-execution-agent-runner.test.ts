import { AIMessage } from '@langchain/core/messages'
import { describe, expect, it, vi } from 'vitest'

import type { BrowserExecutionCommandResult } from '../browser/browser-execution-commands'
import type { AiAuthoringRuntimeConfig } from './ai-authoring-runtime-config'
import {
  BrowserExecutionAgentRunner,
  browserExecutionAgentModelCallOptions,
  browserExecutionAgentSystemPrompt,
  browserExecutionAgentTools,
  type BrowserExecutionAgentModel
} from './browser-execution-agent-runner'
import type { BrowserExecutionController } from './browser-execution-controller'

const runtimeConfig: AiAuthoringRuntimeConfig = {
  apiKey: 'test-key',
  model: 'gpt-5.6-terra',
  callLimit: 12
}

class SequenceModel implements BrowserExecutionAgentModel {
  readonly calls: unknown[][] = []

  constructor(private readonly responses: AIMessage[]) {}

  async invoke(messages: unknown[]): Promise<AIMessage> {
    this.calls.push([...messages])
    const response = this.responses.shift()
    if (!response) {
      throw new Error('The test model ran out of responses.')
    }
    return response
  }
}

function createBrowserController(
  result: ReturnType<typeof vi.fn>,
  captureSelector = vi.fn().mockResolvedValue({
    status: 'captured' as const,
    selector: {
      kind: 'css' as const,
      value: '#captured',
      strategy: 'id' as const
    },
    quality: 'stable-attribute' as const
  })
): Pick<BrowserExecutionController, 'captureSelector' | 'invoke'> {
  return {
    captureSelector,
    invoke: result as (input: unknown) => Promise<BrowserExecutionCommandResult>
  }
}

function createRunner(
  model: BrowserExecutionAgentModel,
  browserController: Pick<
    BrowserExecutionController,
    'captureSelector' | 'invoke'
  >,
  config: AiAuthoringRuntimeConfig = runtimeConfig
): BrowserExecutionAgentRunner {
  return new BrowserExecutionAgentRunner({
    browserController,
    createModel: () => model,
    readRuntimeConfig: () => config
  })
}

function toolCall(
  name: string,
  args: Record<string, unknown>,
  id: string
): AIMessage {
  return new AIMessage({ content: '', tool_calls: [{ name, args, id }] })
}

describe('BrowserExecutionAgentRunner', () => {
  it('allows a terminal completion response and gives the model a current browser observation', () => {
    expect(browserExecutionAgentModelCallOptions).toEqual({
      parallel_tool_calls: false,
      strict: true,
      tool_choice: 'auto'
    })
    expect(browserExecutionAgentSystemPrompt).toContain(
      'either request exactly one approved browser tool or finish with a short plain-text summary'
    )
    expect(browserExecutionAgentSystemPrompt).toContain(
      'TestGen supplies a current accessibility snapshot before your first decision'
    )
    expect(browserExecutionAgentSystemPrompt).toContain(
      'pass only the snapshot reference token'
    )
    expect(browserExecutionAgentTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'function',
          function: expect.objectContaining({ name: 'observe' })
        }),
        expect.objectContaining({
          type: 'function',
          function: expect.objectContaining({
            name: 'click',
            description: expect.stringContaining('snapshot reference token')
          })
        })
      ])
    )
  })

  it('observes before the model decides and completes after the model confirms the intent', async () => {
    const model = new SequenceModel([
      toolCall('click', { target: 'e1' }, 'click-1'),
      new AIMessage('Opened the details panel.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', output: 'snapshot' })
      .mockResolvedValueOnce({ status: 'success', output: 'clicked' })
      .mockResolvedValueOnce({ status: 'success', output: 'details open' })
    const runner = createRunner(model, createBrowserController(invoke))

    const result = await runner.run('Open the details panel.')
    expect(result).toMatchObject({
      status: 'completed',
      actions: ['click'],
      output: 'Opened the details panel.',
      callsUsed: 6,
      testDocument: {
        steps: [
          {
            stepNumber: 1,
            description: '',
            action: 'click',
            selector: { kind: 'css', value: '#captured', strategy: 'id' },
            playwrightLocator: ''
          }
        ]
      }
    })
    expect(result.trace).toEqual([
      {
        kind: 'observation',
        timing: 'initial',
        result: { status: 'success', output: 'snapshot' },
        callsUsed: 1
      },
      {
        kind: 'tool_requested',
        action: 'click',
        input: { target: 'e1' },
        callsUsed: 2
      },
      {
        kind: 'selector_capture',
        target: 'e1',
        result: {
          status: 'captured',
          selector: { kind: 'css', value: '#captured', strategy: 'id' },
          quality: 'stable-attribute'
        },
        callsUsed: 4
      },
      {
        kind: 'tool_result',
        action: 'click',
        result: { status: 'success', output: 'clicked' },
        callsUsed: 4
      },
      {
        kind: 'observation',
        timing: 'after_action',
        result: { status: 'success', output: 'details open' },
        callsUsed: 5
      }
    ])
    expect(invoke).toHaveBeenNthCalledWith(1, { action: 'observe' })
    expect(invoke).toHaveBeenNthCalledWith(2, { action: 'click', target: 'e1' })
    expect(model.calls).toHaveLength(2)
    expect(model.calls[0].at(-1)).toMatchObject({
      content: expect.stringContaining('<browser-observation>\nsnapshot')
    })
  })

  it('publishes a step after a successful action is captured', async () => {
    const model = new SequenceModel([
      toolCall('click', { target: 'e1' }, 'click-1'),
      new AIMessage('Done.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', output: 'snapshot' })
      .mockResolvedValueOnce({ status: 'success', output: 'clicked' })
      .mockResolvedValueOnce({ status: 'success', output: 'after click' })
    const onConfirmedStep = vi.fn()
    const runner = new BrowserExecutionAgentRunner({
      browserController: createBrowserController(invoke),
      createModel: () => model,
      onConfirmedStep,
      readRuntimeConfig: () => runtimeConfig
    })

    await runner.run('Click the item.')

    expect(onConfirmedStep).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'click',
        selector: { kind: 'css', value: '#captured', strategy: 'id' }
      })
    )
  })

  it('retains a successful navigation URL as the captured step parameter', async () => {
    const model = new SequenceModel([
      toolCall('navigate', { url: 'https://example.test/login' }, 'navigate-1'),
      new AIMessage('Done.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', output: 'snapshot' })
      .mockResolvedValueOnce({ status: 'success', output: 'navigated' })
      .mockResolvedValueOnce({ status: 'success', output: 'login page' })
    const runner = createRunner(model, createBrowserController(invoke))

    await expect(runner.run('Open the login page.')).resolves.toMatchObject({
      status: 'completed',
      testDocument: {
        steps: [
          expect.objectContaining({
            action: 'navigate',
            parameter: 'https://example.test/login'
          })
        ]
      }
    })
  })

  it('pauses for a user clarification and resumes the same agent run', async () => {
    const model = new SequenceModel([
      toolCall(
        'request_user_input',
        { question: 'Which account should I use?' },
        'question-1'
      ),
      new AIMessage('I cannot continue without an action.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', output: 'initial snapshot' })
      .mockResolvedValueOnce({
        status: 'success',
        output: 'refreshed snapshot'
      })
    const runner = createRunner(model, createBrowserController(invoke))

    await expect(runner.run('Sign in.')).resolves.toMatchObject({
      status: 'awaiting_user',
      question: 'Which account should I use?'
    })
    await expect(runner.continue('Use the QA account.')).resolves.toMatchObject(
      {
        status: 'stopped',
        reason: 'model_finished_without_action'
      }
    )
    expect(model.calls).toHaveLength(2)
    expect(model.calls[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: JSON.stringify({ response: 'Use the QA account.' }),
          tool_call_id: 'question-1'
        })
      ])
    )
  })

  it('lets the agent upload the fixed file when a click opens a file chooser', async () => {
    const model = new SequenceModel([
      toolCall('click', { target: 'e1' }, 'click-1'),
      toolCall('upload_test_file', {}, 'upload-1'),
      new AIMessage('Uploaded the file.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', output: 'initial snapshot' })
      .mockResolvedValueOnce({
        status: 'success',
        output: 'file chooser opened'
      })
      .mockResolvedValueOnce({
        status: 'failed',
        message:
          'browser_snapshot failed: Error: Tool "browser_snapshot" does not handle the modal state. Modal state: [File chooser]: can be handled by browser_file_upload'
      })
      .mockResolvedValueOnce({ status: 'success', output: 'file uploaded' })
      .mockResolvedValueOnce({ status: 'success', output: 'upload complete' })
    const runner = createRunner(model, createBrowserController(invoke))

    await expect(runner.run('Attach the test file.')).resolves.toMatchObject({
      status: 'completed',
      actions: ['click', 'upload_test_file']
    })
    expect(invoke).toHaveBeenNthCalledWith(3, { action: 'observe' })
    expect(invoke).toHaveBeenNthCalledWith(4, { action: 'upload_test_file' })
  })

  it('returns a failed action result to the model before it adapts and completes', async () => {
    const model = new SequenceModel([
      toolCall('click', { target: 'e1' }, 'click-1'),
      toolCall('type', { target: 'e2', text: 'value' }, 'type-1'),
      new AIMessage('Entered the value.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', output: 'initial snapshot' })
      .mockResolvedValueOnce({ status: 'failed', message: 'target is stale' })
      .mockResolvedValueOnce({
        status: 'success',
        output: 'refreshed snapshot'
      })
      .mockResolvedValueOnce({ status: 'success', output: 'typed' })
      .mockResolvedValueOnce({ status: 'success', output: 'final snapshot' })
    const runner = createRunner(model, createBrowserController(invoke))

    await expect(runner.run('Enter the value.')).resolves.toMatchObject({
      status: 'completed',
      actions: ['type'],
      output: 'Entered the value.',
      callsUsed: 10
    })
    expect(model.calls[1].at(-1)).toMatchObject({
      content: expect.stringContaining(
        '<browser-observation>\nrefreshed snapshot'
      )
    })
    expect(model.calls[1].at(-2)).toMatchObject({
      tool_call_id: 'click-1',
      content: JSON.stringify({ status: 'failed', message: 'target is stale' })
    })
  })

  it('normalizes a snapshot display label before selector capture and browser execution', async () => {
    const model = new SequenceModel([
      toolCall(
        'type',
        { target: 'textbox "*User Name:" [ref=f3e65]', text: '123' },
        'type-1'
      ),
      new AIMessage('Entered the username.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', output: 'snapshot' })
      .mockResolvedValueOnce({ status: 'success', output: 'typed' })
      .mockResolvedValueOnce({ status: 'success', output: 'updated snapshot' })
    const captureSelector = vi.fn().mockResolvedValue({
      status: 'captured' as const,
      selector: {
        kind: 'css' as const,
        value: '#username',
        strategy: 'id' as const
      },
      quality: 'stable-attribute' as const
    })

    const result = await createRunner(
      model,
      createBrowserController(invoke, captureSelector)
    ).run('Fill in 123 as username.')

    expect(result).toMatchObject({
      status: 'completed',
      callsUsed: 6,
      testDocument: {
        steps: [
          {
            action: 'fill',
            selector: { kind: 'css', value: '#username', strategy: 'id' },
            parameter: '123'
          }
        ]
      }
    })
    expect(result.trace?.[1]).toMatchObject({
      kind: 'tool_requested',
      input: { target: 'textbox "*User Name:" [ref=f3e65]', text: '123' },
      normalizedTarget: 'f3e65'
    })
    expect(result.trace?.[2]).toMatchObject({
      kind: 'selector_capture',
      target: 'f3e65',
      requestedTarget: 'textbox "*User Name:" [ref=f3e65]'
    })
    expect(captureSelector).toHaveBeenCalledWith({ target: 'f3e65' })
    expect(invoke).toHaveBeenNthCalledWith(2, {
      action: 'type',
      target: 'f3e65',
      text: '123'
    })
  })

  it('keeps control of a multi-action task until it returns a terminal summary', async () => {
    const model = new SequenceModel([
      toolCall('type', { target: 'e1', text: 'Ada' }, 'type-1'),
      toolCall('click', { target: 'e2' }, 'click-1'),
      new AIMessage('Entered the name and submitted the form.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', output: 'initial snapshot' })
      .mockResolvedValueOnce({ status: 'success', output: 'typed' })
      .mockResolvedValueOnce({ status: 'success', output: 'form snapshot' })
      .mockResolvedValueOnce({ status: 'success', output: 'clicked' })
      .mockResolvedValueOnce({
        status: 'success',
        output: 'confirmation snapshot'
      })
    const runner = createRunner(model, createBrowserController(invoke))

    await expect(
      runner.run('Enter Ada and submit the form.')
    ).resolves.toMatchObject({
      status: 'completed',
      actions: ['type', 'click'],
      output: 'Entered the name and submitted the form.',
      callsUsed: 10,
      testDocument: {
        steps: [
          {
            stepNumber: 1,
            description: '',
            action: 'fill',
            selector: { kind: 'css', value: '#captured', strategy: 'id' },
            playwrightLocator: '',
            parameter: 'Ada'
          },
          {
            stepNumber: 2,
            description: '',
            action: 'click',
            selector: { kind: 'css', value: '#captured', strategy: 'id' },
            playwrightLocator: ''
          }
        ]
      }
    })
    expect(model.calls).toHaveLength(3)
  })

  it('does not treat successful observation as instruction completion', async () => {
    const model = new SequenceModel([
      toolCall('observe', {}, 'observe-1'),
      new AIMessage('I cannot identify the target.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValue({ status: 'success', output: 'snapshot' })
    const runner = createRunner(model, createBrowserController(invoke))

    await expect(runner.run('Open the details panel.')).resolves.toMatchObject({
      status: 'stopped',
      reason: 'model_finished_without_action',
      callsUsed: 4,
      message: 'I cannot identify the target.'
    })
  })

  it('retains a text-only stop message returned as a content block', async () => {
    const model = new SequenceModel([
      new AIMessage({
        content: [{ type: 'text', text: 'I cannot identify the target.' }]
      })
    ])
    const runner = createRunner(
      model,
      createBrowserController(
        vi.fn().mockResolvedValue({ status: 'success', output: 'snapshot' })
      )
    )

    await expect(runner.run('Open the details panel.')).resolves.toMatchObject({
      status: 'stopped',
      reason: 'model_finished_without_action',
      callsUsed: 2,
      message: 'I cannot identify the target.'
    })
  })

  it('enforces the combined model and browser-command call limit', async () => {
    const model = new SequenceModel([toolCall('observe', {}, 'observe-1')])
    const invoke = vi
      .fn()
      .mockResolvedValue({ status: 'success', output: 'snapshot' })
    const runner = createRunner(model, createBrowserController(invoke), {
      ...runtimeConfig,
      callLimit: 2
    })

    await expect(runner.run('Open the details panel.')).resolves.toMatchObject({
      status: 'stopped',
      reason: 'call_limit_reached',
      callsUsed: 2
    })
    expect(model.calls).toHaveLength(1)
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('fails before the model runs when it cannot observe the browser', async () => {
    const model = new SequenceModel([])
    const invoke = vi.fn().mockResolvedValue({
      status: 'failed',
      message: 'browser is unavailable'
    })
    const runner = createRunner(model, createBrowserController(invoke))

    await expect(
      runner.run('Click the sign in button.')
    ).resolves.toMatchObject({
      status: 'failed',
      message: 'browser is unavailable',
      callsUsed: 1
    })
    expect(model.calls).toHaveLength(0)
    expect(invoke).toHaveBeenCalledWith({ action: 'observe' })
  })

  it('rejects blank instructions without creating a model run', async () => {
    const createModel = vi.fn()
    const runner = new BrowserExecutionAgentRunner({
      browserController: createBrowserController(vi.fn()),
      createModel,
      readRuntimeConfig: () => runtimeConfig
    })

    await expect(runner.run('   ')).resolves.toEqual({
      status: 'rejected',
      message: 'A browser task must contain text.',
      callsUsed: 0
    })
    expect(createModel).not.toHaveBeenCalled()
  })

  it('provides a fixed page wait tool for loading observations', () => {
    expect(browserExecutionAgentSystemPrompt).toContain(
      'If the latest observation shows Loading'
    )
    expect(browserExecutionAgentTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          function: expect.objectContaining({ name: 'wait_for_page_settle' })
        })
      ])
    )
  })

  it('streams every trace event as it is recorded', async () => {
    const model = new SequenceModel([
      toolCall('click', { target: 'e1' }, 'click-1'),
      new AIMessage('Opened the details panel.')
    ])
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', output: 'snapshot' })
      .mockResolvedValueOnce({ status: 'success', output: 'clicked' })
      .mockResolvedValueOnce({ status: 'success', output: 'details open' })
    const events: unknown[] = []
    const runner = new BrowserExecutionAgentRunner({
      browserController: createBrowserController(invoke),
      createModel: () => model,
      readRuntimeConfig: () => runtimeConfig,
      onTraceEvent: (event) => events.push(event)
    })

    const result = await runner.run('Open the details panel.')

    expect(result.status).toBe('completed')
    expect(events.length).toBeGreaterThan(0)
    expect(events).toEqual(result.trace)
  })

  it('stops at the next loop boundary when the user requests a stop', async () => {
    const holder: { runner?: BrowserExecutionAgentRunner } = {}
    const model: BrowserExecutionAgentModel = {
      invoke: async () => {
        holder.runner?.requestStop()
        return toolCall('click', { target: 'e1' }, 'click-1')
      }
    }
    const invoke = vi
      .fn()
      .mockResolvedValue({ status: 'success', output: 'snapshot' })
    const runner = new BrowserExecutionAgentRunner({
      browserController: createBrowserController(invoke),
      createModel: () => model,
      readRuntimeConfig: () => runtimeConfig
    })
    holder.runner = runner

    await expect(runner.run('Fill every field.')).resolves.toMatchObject({
      status: 'stopped',
      reason: 'user_requested'
    })
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith({ action: 'observe' })
  })

  it('clears a stale stop request when the next run starts', async () => {
    const model = new SequenceModel([new AIMessage('Nothing to do.')])
    const invoke = vi
      .fn()
      .mockResolvedValue({ status: 'success', output: 'snapshot' })
    const runner = createRunner(model, createBrowserController(invoke))

    runner.requestStop()

    await expect(runner.run('Check the page.')).resolves.toMatchObject({
      status: 'stopped',
      reason: 'model_finished_without_action'
    })
  })
})
