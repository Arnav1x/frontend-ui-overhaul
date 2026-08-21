import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const scriptPath = fileURLToPath(import.meta.url)

export function createDirectToolsDevelopmentEnvironment(environment) {
  return { ...environment, TESTGEN_DIRECT_STEP_CONSOLE: '1' }
}

export function createDevelopmentCommand(
  environment,
  platform,
  nodeExecutable
) {
  if (environment.npm_execpath) {
    return {
      arguments_: [environment.npm_execpath, 'run', 'dev'],
      command: environment.npm_node_execpath ?? nodeExecutable,
      shell: false
    }
  }

  return {
    arguments_: ['dev'],
    command: platform === 'win32' ? 'npm.cmd' : 'npm',
    shell: platform === 'win32'
  }
}

function startDirectToolsDevelopment() {
  const command = createDevelopmentCommand(
    process.env,
    process.platform,
    process.execPath
  )
  const child = spawn(command.command, command.arguments_, {
    env: createDirectToolsDevelopmentEnvironment(process.env),
    shell: command.shell,
    stdio: 'inherit'
  })

  child.once('error', (error) => {
    console.error(`TestGen development tools failed to start: ${error.message}`)
    process.exitCode = 1
  })
  child.once('exit', (code) => {
    process.exitCode = code ?? 1
  })
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  startDirectToolsDevelopment()
}
