import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const projectDirectory = dirname(dirname(scriptPath))

export function resolveLoopbackCdpEndpoint(value) {
  if (!value) {
    throw new Error(
      'TESTGEN_CDP_ENDPOINT is required. Copy the http://127.0.0.1:... endpoint printed by a running TestGen launch.'
    )
  }

  let endpoint
  try {
    endpoint = new URL(value)
  } catch {
    throw new Error('TESTGEN_CDP_ENDPOINT must be a valid HTTP URL.')
  }

  const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost'])
  if (
    endpoint.protocol !== 'http:' ||
    !loopbackHosts.has(endpoint.hostname) ||
    endpoint.username ||
    endpoint.password
  ) {
    throw new Error(
      'TESTGEN_CDP_ENDPOINT must be an unauthenticated loopback HTTP URL.'
    )
  }

  return endpoint.toString().replace(/\/$/, '')
}

export function createInspectorConfig({ cdpEndpoint, playwrightCliPath }) {
  return {
    mcpServers: {
      'testgen-browser': {
        args: [
          playwrightCliPath,
          '--cdp-endpoint',
          cdpEndpoint,
          '--caps=testing'
        ],
        command: process.env.npm_node_execpath ?? 'node',
        cwd: projectDirectory,
        type: 'stdio'
      }
    }
  }
}

async function main() {
  const cdpEndpoint = resolveLoopbackCdpEndpoint(
    process.env.TESTGEN_CDP_ENDPOINT
  )
  const require = createRequire(import.meta.url)
  const playwrightDirectory = dirname(
    require.resolve('@playwright/mcp/package.json')
  )
  const inspectorDirectory = dirname(
    require.resolve('@modelcontextprotocol/inspector/package.json')
  )
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'testgen-inspector-'))
  const configPath = join(temporaryDirectory, 'inspector.mcp.json')
  const config = createInspectorConfig({
    cdpEndpoint,
    playwrightCliPath: join(playwrightDirectory, 'cli.js')
  })
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

  const inspectorLauncher = join(
    inspectorDirectory,
    'clients',
    'launcher',
    'build',
    'index.js'
  )
  const inspector = spawn(
    process.execPath,
    [inspectorLauncher, ...process.argv.slice(2), '--config', configPath],
    { cwd: projectDirectory, stdio: 'inherit' }
  )

  inspector.once('error', async (error) => {
    await removeTemporaryDirectory(temporaryDirectory)
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  inspector.once('exit', async (code) => {
    await removeTemporaryDirectory(temporaryDirectory)
    process.exitCode = code ?? 1
  })
}

async function removeTemporaryDirectory(temporaryDirectory) {
  await rm(temporaryDirectory, { force: true, recursive: true })
}

if (resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
