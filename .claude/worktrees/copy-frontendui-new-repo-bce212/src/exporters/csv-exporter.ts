import type { LiveTestProgressDocument } from '../authoring/live-test-progress'

export const csvHeader = [
  'StepNo',
  'Description',
  'Action',
  'Selector',
  'Parameter',
  'Additional Parameter',
  'Comments'
] as const

export function exportCsv(document: LiveTestProgressDocument): string {
  const rows = document.steps.map((step) => [
    String(step.stepNo),
    step.description,
    step.action,
    step.selector,
    step.parameter,
    step.additionalParameter,
    step.comments
  ])
  return (
    [...rowsWithHeader(rows)]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n') + '\r\n'
  )
}

function rowsWithHeader(
  rows: readonly string[][]
): readonly (readonly string[])[] {
  return [csvHeader, ...rows]
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}
