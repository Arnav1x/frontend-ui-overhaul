import type {
  DirectBrowserToolRequest,
  DirectBrowserToolResult
} from '../browser/direct-browser-tools'

export type DirectBrowserToolName =
  | 'browser_snapshot'
  | 'browser_navigate'
  | 'browser_click'
  | 'browser_type'

type DirectBrowserToolInput = 'url' | 'target' | 'text'

export const directBrowserToolDefinitions: ReadonlyArray<{
  name: DirectBrowserToolName
  inputs: readonly DirectBrowserToolInput[]
}> = [
  { name: 'browser_snapshot', inputs: [] },
  { name: 'browser_navigate', inputs: ['url'] },
  { name: 'browser_click', inputs: ['target'] },
  { name: 'browser_type', inputs: ['target', 'text'] }
]

export interface DirectToolFormValues {
  target: string
  text: string
  url: string
}

export function createDirectToolRequest(
  name: DirectBrowserToolName,
  values: DirectToolFormValues
): DirectBrowserToolRequest | undefined {
  switch (name) {
    case 'browser_snapshot':
      return { name }
    case 'browser_navigate':
      return hasText(values.url) ? { name, url: values.url } : undefined
    case 'browser_click':
      return hasText(values.target)
        ? { name, target: values.target }
        : undefined
    case 'browser_type':
      return hasText(values.target) && hasText(values.text)
        ? { name, target: values.target, text: values.text }
        : undefined
  }
}

export function directToolResultPresentation(
  result: DirectBrowserToolResult | undefined
): { label: string; value: string } {
  if (!result) {
    return { label: 'Latest tool result', value: 'No tool request has run.' }
  }

  if (result.status === 'success') {
    return { label: 'Latest tool output', value: result.output }
  }

  return { label: 'Latest tool error', value: result.message }
}

function hasText(value: string): boolean {
  return value.trim().length > 0
}
