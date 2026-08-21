import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

export const defaultDevelopmentTargetUrl =
  'https://ncrmsstd.digitalinfuzion.com/NCRMS/Main/Login.aspx'

const scriptPath = fileURLToPath(import.meta.url)
const projectDirectory = dirname(dirname(scriptPath))
const cdpEndpointPattern =
  /TestGen browser CDP endpoint: (http:\/\/127\.0\.0\.1:\d+)/

export function resolveDevelopmentTargetUrl(value) {
  return value || defaultDevelopmentTargetUrl
}

export function findTestGenCdpEndpoint(output) {
  return output.match(cdpEndpointPattern)?.[1]
}

export function createTestGenDevelopmentEnvironment(environment) {
  return {
    ...environment,
    TESTGEN_TARGET_URL: resolveDevelopmentTargetUrl(
      environment.TESTGEN_TARGET_URL
    )
  }
}

export function createNpmRunCommand(environment, platform, nodeExecutable) {
  if (environment.npm_execpath) {
    return {
      arguments_: [environment.npm_execpath, 'run', 'dev'],
      command: environment.npm_node_execpath ?? nodeExecutable,
      shell: false
    }
  }

  return {
    arguments_: ['run', 'dev'],
    command: platform === 'win32' ? 'npm.cmd' : 'npm',
    shell: platform === 'win32'
  }
}

function startDevelopmentInspector() {
  const npmRun = createNpmRunCommand(
    process.env,
    process.platform,
    process.execPath
  )
  const testGen = spawn(npmRun.command, npmRun.arguments_, {
    cwd: projectDirectory,
    env: createTestGenDevelopmentEnvironment(process.env),
    shell: npmRun.shell,
    stdio: ['inherit', 'pipe', 'pipe']
  })
  let inspector
  let output = ''
  let isStopping = false

  const stopInspector = () => {
    if (inspector && inspector.exitCode === null && !inspector.killed) {
      inspector.kill()
    }
  }

  const startInspector = (cdpEndpoint) => {
    if (inspector) {
      return
    }

    console.info(`Starting MCP Inspector for ${cdpEndpoint}`)
    inspector = spawn(
      process.execPath,
      [join(projectDirectory, 'scripts', 'testgen-inspector.mjs')],
      {
        cwd: projectDirectory,
        env: { ...process.env, TESTGEN_CDP_ENDPOINT: cdpEndpoint },
        stdio: 'inherit'
      }
    )
    inspector.once('error', (error) => {
      console.error(`MCP Inspector failed to start: ${error.message}`)
    })
  }

  const handleOutput = (chunk, stream) => {
    process[stream].write(chunk)
    output = `${output}${chunk}`
    const cdpEndpoint = findTestGenCdpEndpoint(output)
    if (cdpEndpoint) {
      startInspector(cdpEndpoint)
    }
    output = output.slice(-4096)
  }

  testGen.stdout.on('data', (chunk) => handleOutput(chunk, 'stdout'))
  testGen.stderr.on('data', (chunk) => handleOutput(chunk, 'stderr'))
  testGen.once('error', (error) => {
    console.error(`TestGen failed to start: ${error.message}`)
    process.exitCode = 1
  })
  testGen.once('exit', (code) => {
    stopInspector()
    process.exitCode = code ?? 1
  })

  const stopDevelopmentTools = () => {
    if (isStopping) {
      return
    }

    isStopping = true
    stopInspector()
    testGen.kill()
  }

  process.once('SIGINT', stopDevelopmentTools)
  process.once('SIGTERM', stopDevelopmentTools)
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  startDevelopmentInspector()
}
