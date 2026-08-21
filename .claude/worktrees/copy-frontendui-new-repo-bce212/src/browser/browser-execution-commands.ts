/**
 * The fixed browser-command surface for the M05 Browser Execution Agent. This is a
 * product contract, deliberately separate from the development-only Direct
 * Step Console and from Playwright MCP tool names.
 */
export type BrowserExecutionCommand =
  | { action: 'observe' }
  | { action: 'navigate'; url: string }
  | { action: 'click'; target: string }
  | { action: 'type'; target: string; text: string }
  | { action: 'wait_for_page_settle' }
  | { action: 'upload_test_file' }

export type BrowserExecutionCommandResult =
  | { status: 'success'; output: string }
  | { status: 'rejected'; message: string }
  | { status: 'failed'; message: string }

/**
 * Converts untrusted agent-tool input into the Browser Execution Agent's fixed command
 * union. Arbitrary MCP names and argument objects cannot pass this boundary.
 */
export function parseBrowserExecutionCommand(
  value: unknown
): BrowserExecutionCommand | undefined {
  if (!isRecord(value) || typeof value.action !== 'string') {
    return undefined
  }

  switch (value.action) {
    case 'observe':
      return hasOnlyKeys(value, ['action'])
        ? { action: value.action }
        : undefined
    case 'navigate':
      return hasOnlyKeys(value, ['action', 'url']) && isRequiredText(value.url)
        ? { action: value.action, url: value.url }
        : undefined
    case 'click':
      return hasOnlyKeys(value, ['action', 'target']) &&
        isRequiredText(value.target)
        ? { action: value.action, target: value.target }
        : undefined
    case 'type':
      return hasOnlyKeys(value, ['action', 'target', 'text']) &&
        isRequiredText(value.target) &&
        isRequiredText(value.text)
        ? { action: value.action, target: value.target, text: value.text }
        : undefined
    case 'upload_test_file':
      return hasOnlyKeys(value, ['action'])
        ? { action: value.action }
        : undefined
    case 'wait_for_page_settle':
      return hasOnlyKeys(value, ['action'])
        ? { action: value.action }
        : undefined
    default:
      return undefined
  }
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRequiredText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
