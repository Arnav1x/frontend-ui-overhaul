import { resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  defaultAiAuthoringCallLimit,
  defaultAiAuthoringModel,
  loadLocalEnvironment,
  readAiAuthoringRuntimeConfig
} from './ai-authoring-runtime-config'

describe('AI Authoring runtime configuration', () => {
  it('loads the root local environment file only when it exists', () => {
    const loadFile = vi.fn()

    loadLocalEnvironment({
      currentDirectory: 'C:/TestGen',
      fileExists: (path) => path === resolve('C:/TestGen', '.env'),
      loadFile
    })

    expect(loadFile).toHaveBeenCalledWith(resolve('C:/TestGen', '.env'))
  })

  it('does not require a local environment file before AI Authoring exists', () => {
    const loadFile = vi.fn()

    loadLocalEnvironment({
      currentDirectory: 'C:/TestGen',
      fileExists: () => false,
      loadFile
    })

    expect(loadFile).not.toHaveBeenCalled()
  })

  it('uses the approved defaults with a configured API key', () => {
    expect(
      readAiAuthoringRuntimeConfig({ OPENAI_API_KEY: ' test-key ' })
    ).toEqual({
      apiKey: 'test-key',
      model: defaultAiAuthoringModel,
      callLimit: defaultAiAuthoringCallLimit
    })
  })

  it('accepts editable model and call-limit settings', () => {
    expect(
      readAiAuthoringRuntimeConfig({
        OPENAI_API_KEY: 'test-key',
        TESTGEN_AI_AUTHORING_MODEL: 'gpt-5.6-terra',
        TESTGEN_AI_AUTHORING_CALL_LIMIT: '8'
      })
    ).toEqual({
      apiKey: 'test-key',
      model: 'gpt-5.6-terra',
      callLimit: 8
    })
  })

  it('rejects a missing API key and invalid call limit when the agent is configured', () => {
    expect(() => readAiAuthoringRuntimeConfig({})).toThrow(
      'OPENAI_API_KEY must be set before AI Authoring can run.'
    )
    expect(() =>
      readAiAuthoringRuntimeConfig({
        OPENAI_API_KEY: 'test-key',
        TESTGEN_AI_AUTHORING_CALL_LIMIT: '0'
      })
    ).toThrow('TESTGEN_AI_AUTHORING_CALL_LIMIT must be a positive integer.')
  })
})
