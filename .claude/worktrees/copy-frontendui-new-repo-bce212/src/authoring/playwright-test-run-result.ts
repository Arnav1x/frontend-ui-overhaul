export interface PlaywrightTestRunResult {
  status: 'passed' | 'failed'
  output: string
}

export const playwrightTestRunModes = ['headless', 'headed'] as const

export type PlaywrightTestRunMode = (typeof playwrightTestRunModes)[number]

export function isPlaywrightTestRunMode(
  value: unknown
): value is PlaywrightTestRunMode {
  return (
    typeof value === 'string' &&
    (playwrightTestRunModes as readonly string[]).includes(value)
  )
}
