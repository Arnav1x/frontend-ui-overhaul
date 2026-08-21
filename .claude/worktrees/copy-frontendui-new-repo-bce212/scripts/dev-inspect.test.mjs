import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createNpmRunCommand,
  createTestGenDevelopmentEnvironment,
  defaultDevelopmentTargetUrl,
  findTestGenCdpEndpoint,
  resolveDevelopmentTargetUrl
} from './dev-inspect.mjs'

test("reuses npm's Node CLI when launched through npm", () => {
  assert.deepEqual(
    createNpmRunCommand(
      {
        npm_execpath: 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js',
        npm_node_execpath: 'C:/Program Files/nodejs/node.exe'
      },
      'win32',
      'C:/node.exe'
    ),
    {
      arguments_: [
        'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js',
        'run',
        'dev'
      ],
      command: 'C:/Program Files/nodejs/node.exe',
      shell: false
    }
  )
})

test('uses the CRMS non-production login page as the development inspector target', () => {
  assert.equal(
    resolveDevelopmentTargetUrl(undefined),
    defaultDevelopmentTargetUrl
  )
})

test('preserves an explicit development inspector target', () => {
  assert.equal(
    resolveDevelopmentTargetUrl('https://example.test'),
    'https://example.test'
  )
})

test("finds TestGen's loopback CDP endpoint in development output", () => {
  assert.equal(
    findTestGenCdpEndpoint(
      'TestGen browser CDP endpoint: http://127.0.0.1:55620\n'
    ),
    'http://127.0.0.1:55620'
  )
})

test('sets the default target without removing other environment values', () => {
  assert.deepEqual(
    createTestGenDevelopmentEnvironment({ EXISTING_VALUE: 'kept' }),
    {
      EXISTING_VALUE: 'kept',
      TESTGEN_TARGET_URL: defaultDevelopmentTargetUrl
    }
  )
})
