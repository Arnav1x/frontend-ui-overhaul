import { describe, expect, it } from 'vitest'

import {
  findTabIndex,
  PlaywrightMcpBrowserSession,
  type PlaywrightMcpConnection
} from './playwright-mcp-browser-session'

describe('PlaywrightMcpBrowserSession', () => {
  it('selects the product-owned target by its marker and verifies a snapshot', async () => {
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> =
      []
    const connection: PlaywrightMcpConnection = {
      callTool: async (name, arguments_) => {
        calls.push({ name, arguments: arguments_ })
        if (name === 'browser_tabs' && arguments_.action === 'list') {
          return {
            content: [
              {
                text: '- 0: TestGen host (http://localhost:5173)\n- 1: target-marker (about:blank)',
                type: 'text'
              }
            ]
          }
        }
        return { content: [] }
      },
      close: async () => undefined,
      listTools: async () => ({
        tools: [
          { name: 'browser_tabs' },
          { name: 'browser_snapshot' },
          { name: 'browser_evaluate' }
        ]
      })
    }
    const session = new PlaywrightMcpBrowserSession({
      cdpEndpoint: 'http://127.0.0.1:45678',
      createConnection: async () => connection,
      targetMarker: 'target-marker'
    })

    await session.start()

    expect(session.getStatus()).toEqual({ state: 'ready' })
    expect(calls).toEqual([
      { name: 'browser_tabs', arguments: { action: 'list' } },
      { name: 'browser_tabs', arguments: { action: 'select', index: 1 } },
      { name: 'browser_snapshot', arguments: {} }
    ])
  })

  it('reports failed when the embedded target cannot be identified', async () => {
    const session = new PlaywrightMcpBrowserSession({
      cdpEndpoint: 'http://127.0.0.1:45678',
      createConnection: async () => ({
        callTool: async () => ({
          content: [{ text: '- 0: TestGen host', type: 'text' }]
        }),
        close: async () => undefined,
        listTools: async () => ({
          tools: [
            { name: 'browser_tabs' },
            { name: 'browser_snapshot' },
            { name: 'browser_evaluate' }
          ]
        })
      }),
      targetMarker: 'target-marker'
    })

    await expect(session.start()).rejects.toThrow('could not identify')
    expect(session.getStatus().state).toBe('failed')
  })

  it('maps each direct request to its exact Playwright MCP call', async () => {
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> =
      []
    const connection: PlaywrightMcpConnection = {
      callTool: async (name, arguments_) => {
        calls.push({ name, arguments: arguments_ })
        if (name === 'browser_tabs' && arguments_.action === 'list') {
          return {
            content: [{ text: '- 0: target-marker', type: 'text' }]
          }
        }
        return { content: [{ text: `${name} output`, type: 'text' }] }
      },
      close: async () => undefined,
      listTools: async () => ({
        tools: [
          { name: 'browser_tabs' },
          { name: 'browser_snapshot' },
          { name: 'browser_evaluate' }
        ]
      })
    }
    const session = new PlaywrightMcpBrowserSession({
      cdpEndpoint: 'http://127.0.0.1:45678',
      createConnection: async () => connection,
      targetMarker: 'target-marker'
    })

    await session.start()
    await expect(
      session.invokeDirectTool({ name: 'browser_snapshot' })
    ).resolves.toEqual({ status: 'success', output: 'browser_snapshot output' })
    await expect(
      session.invokeDirectTool({
        name: 'browser_navigate',
        url: 'https://example.test'
      })
    ).resolves.toEqual({ status: 'success', output: 'browser_navigate output' })
    await expect(
      session.invokeDirectTool({ name: 'browser_click', target: 'e1' })
    ).resolves.toEqual({ status: 'success', output: 'browser_click output' })
    await expect(
      session.invokeDirectTool({
        name: 'browser_type',
        target: 'e2',
        text: 'value'
      })
    ).resolves.toEqual({ status: 'success', output: 'browser_type output' })

    expect(calls.slice(3)).toEqual([
      { name: 'browser_snapshot', arguments: {} },
      {
        name: 'browser_navigate',
        arguments: { url: 'https://example.test' }
      },
      { name: 'browser_click', arguments: { target: 'e1' } },
      { name: 'browser_type', arguments: { target: 'e2', text: 'value' } }
    ])
  })

  it('maps each Browser Execution Agent command through its product contract', async () => {
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> =
      []
    const connection: PlaywrightMcpConnection = {
      callTool: async (name, arguments_) => {
        calls.push({ name, arguments: arguments_ })
        if (name === 'browser_tabs' && arguments_.action === 'list') {
          return {
            content: [{ text: '- 0: target-marker', type: 'text' }]
          }
        }
        return { content: [{ text: `${name} output`, type: 'text' }] }
      },
      close: async () => undefined,
      listTools: async () => ({
        tools: [
          { name: 'browser_tabs' },
          { name: 'browser_snapshot' },
          { name: 'browser_evaluate' }
        ]
      })
    }
    const session = new PlaywrightMcpBrowserSession({
      cdpEndpoint: 'http://127.0.0.1:45678',
      createConnection: async () => connection,
      targetMarker: 'target-marker'
    })

    await session.start()
    await expect(
      session.invokeBrowserExecutionCommand({ action: 'observe' })
    ).resolves.toEqual({
      status: 'success',
      output: 'browser_snapshot output'
    })
    await expect(
      session.invokeBrowserExecutionCommand({
        action: 'navigate',
        url: 'https://example.test'
      })
    ).resolves.toEqual({ status: 'success', output: 'browser_navigate output' })
    await expect(
      session.invokeBrowserExecutionCommand({ action: 'click', target: 'e1' })
    ).resolves.toEqual({ status: 'success', output: 'browser_click output' })
    await expect(
      session.invokeBrowserExecutionCommand({
        action: 'type',
        target: 'e2',
        text: 'value'
      })
    ).resolves.toEqual({ status: 'success', output: 'browser_type output' })

    expect(calls.slice(3)).toEqual([
      { name: 'browser_snapshot', arguments: {} },
      {
        name: 'browser_navigate',
        arguments: { url: 'https://example.test' }
      },
      { name: 'browser_click', arguments: { target: 'e1' } },
      { name: 'browser_type', arguments: { target: 'e2', text: 'value' } }
    ])
  })

  it('captures a selector with a fixed evaluation against the exact snapshot target', async () => {
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> =
      []
    const session = new PlaywrightMcpBrowserSession({
      cdpEndpoint: 'http://127.0.0.1:45678',
      createConnection: async () => ({
        callTool: async (name, arguments_) => {
          calls.push({ name, arguments: arguments_ })
          if (name === 'browser_tabs' && arguments_.action === 'list') {
            return { content: [{ text: '- 0: target-marker', type: 'text' }] }
          }
          if (name === 'browser_evaluate') {
            return {
              content: [
                {
                  type: 'text',
                  text: '### Result\n{"status":"captured","selector":{"kind":"css","value":"#submit","strategy":"id"},"quality":"stable-attribute"}'
                }
              ]
            }
          }
          return { content: [] }
        },
        close: async () => undefined,
        listTools: async () => ({
          tools: [
            { name: 'browser_tabs' },
            { name: 'browser_snapshot' },
            { name: 'browser_evaluate' }
          ]
        })
      }),
      targetMarker: 'target-marker'
    })

    await session.start()
    await expect(session.captureSelector({ target: 'e42' })).resolves.toEqual({
      status: 'captured',
      selector: { kind: 'css', value: '#submit', strategy: 'id' },
      quality: 'stable-attribute'
    })
    expect(calls.at(-1)).toMatchObject({
      name: 'browser_evaluate',
      arguments: { target: 'e42', function: expect.any(String) }
    })
  })

  it('keeps the session ready after a tool-level failure', async () => {
    const session = new PlaywrightMcpBrowserSession({
      cdpEndpoint: 'http://127.0.0.1:45678',
      createConnection: async () => createReadyConnection({ isError: true }),
      targetMarker: 'target-marker'
    })

    await session.start()
    await expect(
      session.invokeDirectTool({ name: 'browser_click', target: 'stale' })
    ).resolves.toEqual({
      status: 'failed',
      message: 'browser_click failed: tool action failed'
    })
    expect(session.getStatus()).toEqual({ state: 'ready' })
  })

  it('serializes direct tools through the selected MCP connection', async () => {
    const directCalls: string[] = []
    let completeSnapshot: (() => void) | undefined
    let holdSnapshot = false
    const session = new PlaywrightMcpBrowserSession({
      cdpEndpoint: 'http://127.0.0.1:45678',
      createConnection: async () => ({
        callTool: async (name, arguments_) => {
          if (name === 'browser_tabs' && arguments_.action === 'list') {
            return {
              content: [{ text: '- 0: target-marker', type: 'text' }]
            }
          }
          if (name === 'browser_tabs') {
            return { content: [] }
          }
          if (name === 'browser_snapshot' && holdSnapshot) {
            directCalls.push(name)
            await new Promise<void>((resolve) => {
              completeSnapshot = resolve
            })
          } else if (name === 'browser_snapshot') {
            directCalls.push(name)
          } else {
            directCalls.push(name)
          }
          return { content: [{ text: name, type: 'text' }] }
        },
        close: async () => undefined,
        listTools: async () => ({
          tools: [
            { name: 'browser_tabs' },
            { name: 'browser_snapshot' },
            { name: 'browser_evaluate' }
          ]
        })
      }),
      targetMarker: 'target-marker'
    })

    await session.start()
    directCalls.length = 0
    holdSnapshot = true
    const snapshot = session.invokeDirectTool({ name: 'browser_snapshot' })
    await Promise.resolve()
    const click = session.invokeDirectTool({
      name: 'browser_click',
      target: 'e1'
    })
    await Promise.resolve()

    expect(directCalls).toEqual(['browser_snapshot'])
    completeSnapshot?.()
    await expect(snapshot).resolves.toEqual({
      status: 'success',
      output: 'browser_snapshot'
    })
    await expect(click).resolves.toEqual({
      status: 'success',
      output: 'browser_click'
    })
    expect(directCalls).toEqual(['browser_snapshot', 'browser_click'])
  })

  it('updates browser availability when the MCP transport fails', async () => {
    const session = new PlaywrightMcpBrowserSession({
      cdpEndpoint: 'http://127.0.0.1:45678',
      createConnection: async () => ({
        ...createReadyConnection(),
        callTool: async (name, arguments_) => {
          if (name === 'browser_tabs' && arguments_.action === 'list') {
            return {
              content: [{ text: '- 0: target-marker', type: 'text' }]
            }
          }
          if (name === 'browser_snapshot') {
            return { content: [{ text: 'snapshot', type: 'text' }] }
          }
          if (name === 'browser_tabs') {
            return { content: [] }
          }
          throw new Error('Playwright MCP closed.')
        }
      }),
      targetMarker: 'target-marker'
    })

    await session.start()
    await expect(
      session.invokeDirectTool({ name: 'browser_click', target: 'e1' })
    ).resolves.toEqual({ status: 'failed', message: 'Playwright MCP closed.' })
    expect(session.getStatus()).toEqual({
      state: 'failed',
      detail: 'Playwright MCP closed.'
    })
  })
})

function createReadyConnection(
  directResult: Partial<{ isError: boolean }> = {}
): PlaywrightMcpConnection {
  return {
    callTool: async (name, arguments_) => {
      if (name === 'browser_tabs' && arguments_.action === 'list') {
        return { content: [{ text: '- 0: target-marker', type: 'text' }] }
      }
      if (name === 'browser_click') {
        return {
          content: [{ text: 'tool action failed', type: 'text' }],
          ...directResult
        }
      }
      return { content: [{ text: 'snapshot', type: 'text' }] }
    },
    close: async () => undefined,
    listTools: async () => ({
      tools: [
        { name: 'browser_tabs' },
        { name: 'browser_snapshot' },
        { name: 'browser_evaluate' }
      ]
    })
  }
}

describe('findTabIndex', () => {
  it('does not select a tab from its current URL', () => {
    expect(
      findTabIndex(
        {
          content: [
            {
              text: '- 3: target-marker (https://same.example)\n- 4: other (https://same.example)',
              type: 'text'
            }
          ]
        },
        'target-marker'
      )
    ).toBe(3)
  })
})
