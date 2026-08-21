import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useRef, useState, type ReactElement } from 'react'

import type { BrowserSessionStatus } from '../browser/browser-session'
import type { DirectToolsBridge } from '../browser/direct-browser-tools'
import { browserSessionPresentation } from './browser-session-presentation'
import {
  createDirectToolRequest,
  directBrowserToolDefinitions,
  directToolResultPresentation,
  type DirectBrowserToolName,
  type DirectToolFormValues
} from './direct-step-console-presentation'

export function DirectStepConsole({
  browserStatus,
  directTools
}: {
  browserStatus: BrowserSessionStatus
  directTools: DirectToolsBridge
}): ReactElement {
  const inFlightRef = useRef(false)
  const [inFlight, setInFlight] = useState(false)
  const [latestResult, setLatestResult] =
    useState<Awaited<ReturnType<DirectToolsBridge['invoke']>>>()
  const [values, setValues] = useState<DirectToolFormValues>({
    target: '',
    text: '',
    url: ''
  })

  async function invokeTool(name: DirectBrowserToolName): Promise<void> {
    if (inFlightRef.current) {
      return
    }

    const request = createDirectToolRequest(name, values)
    if (!request) {
      return
    }

    inFlightRef.current = true
    setInFlight(true)
    try {
      setLatestResult(await directTools.invoke(request))
    } catch (error) {
      setLatestResult({
        status: 'failed',
        message: error instanceof Error ? error.message : String(error)
      })
    } finally {
      inFlightRef.current = false
      setInFlight(false)
    }
  }

  const result = directToolResultPresentation(latestResult)

  return (
    <Paper
      component="aside"
      elevation={0}
      sx={{ border: 1, borderColor: 'divider', minHeight: '100%', p: 3 }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography component="h2" variant="h6">
            Direct Step Console
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Development-only browser diagnostics. Results do not create test
            steps.
          </Typography>
        </Box>

        <Box>
          <Typography color="text.secondary" variant="caption">
            Browser availability
          </Typography>
          <Typography variant="body2">
            {browserSessionPresentation(browserStatus)}
          </Typography>
        </Box>

        {directBrowserToolDefinitions.map((tool) => (
          <Box component="section" key={tool.name}>
            <Typography component="h3" variant="subtitle2">
              {tool.name}
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {tool.inputs.includes('url') ? (
                <TextField
                  disabled={inFlight}
                  label="URL"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      url: event.target.value
                    }))
                  }
                  required
                  size="small"
                  value={values.url}
                />
              ) : null}
              {tool.inputs.includes('target') ? (
                <TextField
                  disabled={inFlight}
                  label="Target reference"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      target: event.target.value
                    }))
                  }
                  required
                  size="small"
                  value={values.target}
                />
              ) : null}
              {tool.inputs.includes('text') ? (
                <TextField
                  disabled={inFlight}
                  label="Text"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      text: event.target.value
                    }))
                  }
                  required
                  size="small"
                  value={values.text}
                />
              ) : null}
              <Button
                disabled={
                  inFlight || !createDirectToolRequest(tool.name, values)
                }
                onClick={() => void invokeTool(tool.name)}
                size="small"
                variant="outlined"
              >
                {tool.name}
              </Button>
            </Stack>
          </Box>
        ))}

        <Box>
          <Typography color="text.secondary" variant="caption">
            {result.label}
          </Typography>
          <Box
            aria-live="polite"
            component="pre"
            role={
              latestResult && latestResult.status !== 'success'
                ? 'alert'
                : undefined
            }
            sx={{
              bgcolor: 'grey.100',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              m: 0,
              maxHeight: 'min(45vh, 520px)',
              overflow: 'auto',
              p: 1.5,
              whiteSpace: 'pre-wrap'
            }}
          >
            {result.value}
          </Box>
        </Box>
      </Stack>
    </Paper>
  )
}
