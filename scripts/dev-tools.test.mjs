import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDevelopmentCommand,
  createDirectToolsDevelopmentEnvironment
} from './dev-tools.mjs'

test('enables the Direct Step Console without removing existing environment values', () => {
  assert.deepEqual(
    createDirectToolsDevelopmentEnvironment({ EXISTING_VALUE: 'kept' }),
    { EXISTING_VALUE: 'kept', TESTGEN_DIRECT_STEP_CONSOLE: '1' }
  )
})

test('starts the normal npm development command', () => {
  assert.deepEqual(createDevelopmentCommand({}, 'linux', '/node'), {
    arguments_: ['dev'],
    command: 'npm',
    shell: false
  })
  assert.deepEqual(createDevelopmentCommand({}, 'win32', '/node'), {
    arguments_: ['dev'],
    command: 'npm.cmd',
    shell: true
  })
  assert.deepEqual(
    createDevelopmentCommand(
      {
        npm_execpath: 'C:/node/npm-cli.js',
        npm_node_execpath: 'C:/node/node.exe'
      },
      'win32',
      '/node'
    ),
    {
      arguments_: ['C:/node/npm-cli.js', 'run', 'dev'],
      command: 'C:/node/node.exe',
      shell: false
    }
  )
})
