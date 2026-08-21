import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useRef, useState, type ReactElement } from 'react'

import type {
  BrowserExecutionAction,
  BrowserExecutionAgentRunResult
} from '../authoring/browser-execution-agent-run-result'

type AgentTestingConsoleBridge = Window['testGen']['agentTestingConsole']

export function AgentTestingConsole({
  agentTestingConsole
}: {
  agentTestingConsole: AgentTestingConsoleBridge
}): ReactElement {
  const inFlightRef = useRef(false)
  const [inFlight, setInFlight] = useState(false)
  const [executorInstruction, setExecutorInstruction] = useState('')
  const [executorResult, setExecutorResult] =
    useState<BrowserExecutionAgentRunResult>()
  const [showTypedText, setShowTypedText] = useState(false)

  async function runExecutor(): Promise<void> {
    await runExclusive(async () => {
      setExecutorResult(await agentTestingConsole.execute(executorInstruction))
    }, setExecutorResult)
  }

  async function runExclusive(
    action: () => Promise<void>,
    setFailure: (value: BrowserExecutionAgentRunResult) => void
  ): Promise<void> {
    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true
    setInFlight(true)
    try {
      await action()
    } catch (error) {
      setFailure({
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
        callsUsed: 0
      })
    } finally {
      inFlightRef.current = false
      setInFlight(false)
    }
  }

  return (
    <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
      <Stack divider={<Divider flexItem />} spacing={3}>
        <Box>
          <Typography component="h1" variant="h5">
            Agent Testing Console
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Development-only diagnostics for the bounded Browser Execution
            Agent. Completed results show incomplete test-document output.
          </Typography>
        </Box>

        <Box component="section">
          <Stack spacing={1.5}>
            <Box>
              <Typography component="h2" variant="h6">
                Browser Execution Agent
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Give the agent a complete browser task. It owns the bounded
                observe-act-refresh loop through the fixed product-owned route.
              </Typography>
            </Box>
            <TextField
              disabled={inFlight}
              label="Browser task"
              multiline
              onChange={(event) => setExecutorInstruction(event.target.value)}
              placeholder="For example: Enter the test username and password, then sign in."
              required
              value={executorInstruction}
            />
            <Button
              disabled={inFlight || !executorInstruction.trim()}
              onClick={() => void runExecutor()}
              variant="contained"
            >
              {inFlight ? 'Running agent' : 'Run browser task'}
            </Button>
            <BrowserTaskResult
              onToggleTypedText={() => setShowTypedText((current) => !current)}
              result={executorResult}
              showTypedText={showTypedText}
            />
          </Stack>
        </Box>
      </Stack>
    </Paper>
  )
}

function BrowserTaskResult({
  onToggleTypedText,
  result,
  showTypedText
}: {
  onToggleTypedText: () => void
  result: BrowserExecutionAgentRunResult | undefined
  showTypedText: boolean
}): ReactElement {
  if (!result) {
    return (
      <Alert severity="info">
        Run a browser task to see what the agent completed. This console is a
        diagnostic: it verifies browser control and shows an in-memory,
        incomplete test document without saving it.
      </Alert>
    )
  }

  if (result.status === 'completed') {
    return (
      <Stack spacing={1.5}>
        <Alert severity="success">
          Browser task completed. The agent performed {result.actions.length}{' '}
          browser action{result.actions.length === 1 ? '' : 's'}.
        </Alert>
        <Box>
          <Typography color="text.secondary" variant="caption">
            Agent report
          </Typography>
          <Typography variant="body2">{result.output}</Typography>
        </Box>
        <Box>
          <Typography color="text.secondary" variant="caption">
            Browser action sequence
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.5 }}>
            {result.actions.map((action, index) => (
              <Chip
                key={`${action}-${index}`}
                label={`${index + 1}. ${actionLabel(action)}`}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>
          <Typography
            color="text.secondary"
            sx={{ mt: 0.75 }}
            variant="caption"
          >
            These are execution tool categories. The captured test document
            below contains the corresponding incomplete export facts.
          </Typography>
        </Box>
        <CapturedTestDocument
          showTypedText={showTypedText}
          testDocument={result.testDocument}
        />
        <Typography color="text.secondary" variant="caption">
          Diagnostic detail: {result.callsUsed} model/browser calls used.
        </Typography>
        <Alert severity="info">
          Next step: inspect the visible browser to confirm the outcome.
          Selector capture is shown in the document and trace when it succeeds;
          this document remains in memory and is not yet exported.
        </Alert>
        <ExecutionTrace
          onToggleTypedText={onToggleTypedText}
          result={result}
          showTypedText={showTypedText}
        />
      </Stack>
    )
  }

  const message =
    result.status === 'awaiting_user'
      ? result.question
      : result.status === 'stopped'
        ? (result.message ?? stoppedMessage(result.reason))
        : result.message

  return (
    <Stack spacing={1.5}>
      <Alert
        severity={
          result.status === 'awaiting_user' || result.status === 'rejected'
            ? 'warning'
            : 'error'
        }
      >
        <Typography variant="subtitle2">
          {result.status === 'awaiting_user'
            ? 'Browser task needs clarification'
            : result.status === 'stopped'
              ? 'Browser task stopped'
              : 'Browser task could not start or finish'}
        </Typography>
        <Typography variant="body2">{message}</Typography>
        <Typography display="block" sx={{ mt: 0.5 }} variant="caption">
          Diagnostic detail: {result.callsUsed} model/browser calls used.
        </Typography>
      </Alert>
      <ExecutionTrace
        onToggleTypedText={onToggleTypedText}
        result={result}
        showTypedText={showTypedText}
      />
    </Stack>
  )
}

function CapturedTestDocument({
  showTypedText,
  testDocument
}: {
  showTypedText: boolean
  testDocument: Extract<
    BrowserExecutionAgentRunResult,
    { status: 'completed' }
  >['testDocument']
}): ReactElement {
  return (
    <Box component="section">
      <Typography component="h3" variant="subtitle2">
        Captured standardized test document
      </Typography>
      <Typography color="text.secondary" variant="caption">
        Intermediary output for future exporters. Playwright locators come from
        MCP; CSS selector capture is attempted for each click and fill.
      </Typography>
      <Box sx={{ mt: 1 }}>
        <RawValue
          value={maskTestDocumentParameters(testDocument, showTypedText)}
        />
      </Box>
    </Box>
  )
}

function ExecutionTrace({
  onToggleTypedText,
  result,
  showTypedText
}: {
  onToggleTypedText: () => void
  result: BrowserExecutionAgentRunResult
  showTypedText: boolean
}): ReactElement {
  const trace = result.trace ?? []

  return (
    <Box component="section">
      <Stack spacing={1}>
        <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
          <Typography component="h3" variant="subtitle2">
            Execution trace
          </Typography>
          <Chip label={`${trace.length} events`} size="small" />
          <Button onClick={onToggleTypedText} size="small">
            {showTypedText ? 'Mask typed text' : 'Reveal typed text'}
          </Button>
        </Box>
        <Typography color="text.secondary" variant="caption">
          Chronological product-owned record of browser observations, model tool
          requests, and browser results. Typed values are masked by default.
        </Typography>
        {trace.length ? (
          trace.map((event, index) => (
            <Accordion key={`${event.kind}-${index}`} disableGutters>
              <AccordionSummary>
                <Typography variant="body2">
                  {index + 1}. {traceEventLabel(event, showTypedText)}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <RawTraceEvent event={event} showTypedText={showTypedText} />
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Alert severity="warning">
            This result has no trace. Runs started after this diagnostic update
            include one.
          </Alert>
        )}
        <Accordion disableGutters>
          <AccordionSummary>
            <Typography variant="body2">Raw run result</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <RawValue value={maskRunResult(result, showTypedText)} />
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  )
}

function RawTraceEvent({
  event,
  showTypedText
}: {
  event: NonNullable<BrowserExecutionAgentRunResult['trace']>[number]
  showTypedText: boolean
}): ReactElement {
  return <RawValue value={maskTraceEvent(event, showTypedText)} />
}

function RawValue({ value }: { value: unknown }): ReactElement {
  return (
    <Box
      component="pre"
      sx={{
        bgcolor: 'grey.100',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        m: 0,
        maxHeight: 320,
        overflow: 'auto',
        p: 1.5,
        whiteSpace: 'pre-wrap'
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
  )
}

function traceEventLabel(
  event: NonNullable<BrowserExecutionAgentRunResult['trace']>[number],
  showTypedText: boolean
): string {
  switch (event.kind) {
    case 'observation':
      return `${event.timing === 'initial' ? 'Initial' : 'Refreshed'} browser observation: ${event.result.status}`
    case 'tool_requested':
      return `Agent requested ${event.action}: ${toolInputSummary(event.input, showTypedText)}`
    case 'tool_result':
      return `Browser ${event.action} result: ${event.result.status}`
    case 'selector_capture':
      return event.result.status === 'captured'
        ? `Captured ${event.result.quality} selector for ${event.target}`
        : `Selector capture unresolved for ${event.target}`
  }
}

function toolInputSummary(
  input: Record<string, unknown>,
  showTypedText: boolean
): string {
  const pairs = Object.entries(input).map(([key, value]) => {
    const isTypedText = key === 'text'
    const displayValue =
      isTypedText && !showTypedText ? '••••••' : String(value)
    return `${key}=${displayValue}`
  })
  return pairs.length ? pairs.join(', ') : 'no input'
}

function maskRunResult(
  result: BrowserExecutionAgentRunResult,
  showTypedText: boolean
): unknown {
  return {
    ...result,
    ...(result.status === 'completed' && {
      testDocument: maskTestDocumentParameters(
        result.testDocument,
        showTypedText
      )
    }),
    trace: result.trace?.map((event) => maskTraceEvent(event, showTypedText))
  }
}

function maskTestDocumentParameters(
  testDocument: Extract<
    BrowserExecutionAgentRunResult,
    { status: 'completed' }
  >['testDocument'],
  showTypedText: boolean
): unknown {
  if (showTypedText) {
    return testDocument
  }

  return {
    ...testDocument,
    steps: testDocument.steps.map((step) => ({
      ...step,
      ...(step.parameter !== undefined && { parameter: '••••••' })
    }))
  }
}

function maskTraceEvent(
  event: NonNullable<BrowserExecutionAgentRunResult['trace']>[number],
  showTypedText: boolean
): unknown {
  if (event.kind !== 'tool_requested' || showTypedText) {
    return event
  }

  if (!('text' in event.input)) {
    return event
  }

  return { ...event, input: { ...event.input, text: '••••••' } }
}

function actionLabel(action: BrowserExecutionAction): string {
  switch (action) {
    case 'navigate':
      return 'Navigate'
    case 'click':
      return 'Click'
    case 'type':
      return 'Enter text'
    case 'upload_test_file':
      return 'Upload test file'
  }
}

function stoppedMessage(
  reason: Extract<
    BrowserExecutionAgentRunResult,
    { status: 'stopped' }
  >['reason']
): string {
  switch (reason) {
    case 'call_limit_reached':
      return 'The configured browser-task call limit was reached.'
    case 'model_finished_without_action':
      return 'The agent stopped before it performed a browser action.'
    case 'multiple_tool_calls_requested':
      return 'The agent requested more than one browser tool in a single turn.'
    case 'user_requested':
      return 'The run was stopped by the user.'
  }
}
