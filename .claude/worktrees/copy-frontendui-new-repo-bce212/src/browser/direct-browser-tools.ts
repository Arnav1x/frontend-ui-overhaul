/**
 * The complete development-only browser tool surface. This contract is owned
 * by the browser boundary so future product controllers can use it without
 * depending on a renderer, MCP, or Playwright types.
 */
export type DirectBrowserToolRequest =
  | { name: 'browser_snapshot' }
  | { name: 'browser_navigate'; url: string }
  | { name: 'browser_click'; target: string }
  | { name: 'browser_type'; target: string; text: string }

export type DirectBrowserToolResult =
  | { status: 'success'; output: string }
  | { status: 'rejected'; message: string }
  | { status: 'failed'; message: string }

export interface DirectToolsBridge {
  getConfiguration: () => Promise<{ enabled: boolean }>
  invoke: (
    request: DirectBrowserToolRequest
  ) => Promise<DirectBrowserToolResult>
}

/**
 * Converts untrusted IPC data into the fixed direct-tool union. No arbitrary
 * MCP names or argument objects can pass this boundary.
 */
export function parseDirectBrowserToolRequest(
  value: unknown
): DirectBrowserToolRequest | undefined {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return undefined
  }

  switch (value.name) {
    case 'browser_snapshot':
      return hasOnlyKeys(value, ['name']) ? { name: value.name } : undefined
    case 'browser_navigate':
      return hasOnlyKeys(value, ['name', 'url']) && isRequiredText(value.url)
        ? { name: value.name, url: value.url }
        : undefined
    case 'browser_click':
      return hasOnlyKeys(value, ['name', 'target']) &&
        isRequiredText(value.target)
        ? { name: value.name, target: value.target }
        : undefined
    case 'browser_type':
      return hasOnlyKeys(value, ['name', 'target', 'text']) &&
        isRequiredText(value.target) &&
        isRequiredText(value.text)
        ? { name: value.name, target: value.target, text: value.text }
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
