import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'

export const defaultAiAuthoringModel = 'gpt-5.6-terra'
// A runaway backstop only; ■ Stop is the practical brake, so no counter is shown.
export const defaultAiAuthoringCallLimit = 1000

export interface AiAuthoringRuntimeConfig {
  apiKey: string
  model: string
  callLimit: number
}

export interface LocalEnvironmentLoader {
  currentDirectory: string
  fileExists: (path: string) => boolean
  loadFile: (path: string) => void
}

export function loadLocalEnvironment(
  loader: LocalEnvironmentLoader = {
    currentDirectory: process.cwd(),
    fileExists: existsSync,
    loadFile: loadEnvFile
  }
): void {
  const environmentPath = resolve(loader.currentDirectory, '.env')
  if (loader.fileExists(environmentPath)) {
    loader.loadFile(environmentPath)
  }
}

export function readAiAuthoringRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env
): AiAuthoringRuntimeConfig {
  const apiKey = readRequiredValue(environment, 'OPENAI_API_KEY')
  const model = readOptionalValue(
    environment,
    'TESTGEN_AI_AUTHORING_MODEL',
    defaultAiAuthoringModel
  )
  const callLimit = readPositiveInteger(
    environment,
    'TESTGEN_AI_AUTHORING_CALL_LIMIT',
    defaultAiAuthoringCallLimit
  )

  return { apiKey, model, callLimit }
}

function readRequiredValue(
  environment: NodeJS.ProcessEnv,
  name: string
): string {
  const value = environment[name]?.trim()
  if (!value) {
    throw new Error(`${name} must be set before AI Authoring can run.`)
  }
  return value
}

function readOptionalValue(
  environment: NodeJS.ProcessEnv,
  name: string,
  defaultValue: string
): string {
  return environment[name]?.trim() || defaultValue
}

function readPositiveInteger(
  environment: NodeJS.ProcessEnv,
  name: string,
  defaultValue: number
): number {
  const rawValue = environment[name]?.trim()
  if (!rawValue) {
    return defaultValue
  }

  const value = Number(rawValue)
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`)
  }
  return value
}
