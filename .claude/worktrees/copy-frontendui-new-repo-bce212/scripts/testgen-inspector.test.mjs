import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createInspectorConfig,
  resolveLoopbackCdpEndpoint
} from './testgen-inspector.mjs'

test('accepts a loopback CDP endpoint', () => {
  assert.equal(
    resolveLoopbackCdpEndpoint('http://127.0.0.1:55620'),
    'http://127.0.0.1:55620'
  )
})

test('rejects a non-loopback CDP endpoint', () => {
  assert.throws(
    () => resolveLoopbackCdpEndpoint('https://example.test:55620'),
    /loopback HTTP URL/
  )
})

test('configures a separate Playwright MCP stdio process', () => {
  const config = createInspectorConfig({
    cdpEndpoint: 'http://127.0.0.1:55620',
    playwrightCliPath: 'C:/testgen/node_modules/@playwright/mcp/cli.js'
  })

  assert.deepEqual(config.mcpServers['testgen-browser'].args, [
    'C:/testgen/node_modules/@playwright/mcp/cli.js',
    '--cdp-endpoint',
    'http://127.0.0.1:55620',
    '--caps=testing'
  ])
  assert.equal(config.mcpServers['testgen-browser'].type, 'stdio')
})
