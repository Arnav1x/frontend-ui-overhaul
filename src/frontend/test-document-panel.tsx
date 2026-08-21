import {
  Add,
  Close,
  Download,
  PlayArrow,
  UnfoldMore
} from '@mui/icons-material'
import {
  Box,
  Button,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import {
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from 'react'

import type {
  LiveTestProgressDocument,
  LiveTestProgressStep
} from '../authoring/live-test-progress'
import type {
  PlaywrightTestRunMode,
  PlaywrightTestRunResult
} from '../authoring/playwright-test-run-result'
import { exportCsv } from '../exporters/csv-exporter'
import { exportPlaywright } from '../exporters/playwright-exporter'
import { codeSurface, microLabelSx, monoFontFamily } from './app-theme'
import { downloadFile } from './download-file'
import type { RunTraceRow } from './run-trace-presentation'
import { documentStatusLine, specStepLine } from './spec-presentation'
import { StatusTag } from './status-tag'

const specFileName = 'live-test-progress.spec.ts'

const codeTextSx = {
  fontFamily: monoFontFamily,
  fontSize: '11px',
  lineHeight: 1.9
} as const

function CodeBlock({
  children,
  sx
}: {
  children: ReactNode
  sx?: Record<string, unknown>
}): ReactElement {
  return (
    <Box
      sx={{
        bgcolor: codeSurface.background,
        borderRadius: '8px',
        color: codeSurface.base,
        overflowX: 'auto',
        px: 1.5,
        py: 1.25,
        ...codeTextSx,
        ...sx
      }}
    >
      {children}
    </Box>
  )
}

function CodeSpan({
  color,
  children,
  italic
}: {
  color: string
  children: ReactNode
  italic?: boolean
}): ReactElement {
  return (
    <Box
      component="span"
      sx={{ color, fontStyle: italic ? 'italic' : undefined }}
    >
      {children}
    </Box>
  )
}

function CodeField({
  masked,
  onChange,
  value
}: {
  masked?: boolean
  onChange: (value: string) => void
  value: string
}): ReactElement {
  return (
    <InputBase
      inputProps={{ 'aria-label': 'Editable step value' }}
      onChange={(event) => onChange(event.target.value)}
      type={masked ? 'password' : 'text'}
      value={value}
      sx={{
        mx: 0,
        p: 0,
        verticalAlign: 'baseline',
        '& input': {
          color: codeSurface.string,
          fontFamily: monoFontFamily,
          fontSize: '11px',
          p: 0,
          width: `${Math.max(value.length, 1)}ch`
        },
        '&:focus-within': {
          borderRadius: '3px',
          boxShadow: `0 0 0 1px ${codeSurface.accent}`
        }
      }}
    />
  )
}

/**
 * One rendered spec line for a captured step. When editable, the selector and
 * parameter fields are live inputs; the export always uses the raw values.
 */
function SpecStepCode({
  editable,
  onUpdate,
  position,
  running,
  setup,
  step
}: {
  editable: boolean
  onUpdate?: (field: keyof LiveTestProgressStep, value: string) => void
  position: number
  running?: boolean
  setup: boolean
  step: LiveTestProgressStep
}): ReactElement {
  const line = specStepLine(step, position)
  const quote = <CodeSpan color={codeSurface.string}>&apos;</CodeSpan>
  const value = (field: 'selector' | 'parameter', masked?: boolean) =>
    editable && onUpdate ? (
      <>
        {quote}
        <CodeField
          masked={masked}
          onChange={(next) => onUpdate(field, next)}
          value={step[field]}
        />
        {quote}
      </>
    ) : (
      <CodeSpan color={codeSurface.string}>
        &apos;
        {masked ? '••••' : step[field]}
        &apos;
      </CodeSpan>
    )

  const content =
    line.kind === 'error' ? (
      <>
        <CodeSpan color={codeSurface.accent}>throw new Error(</CodeSpan>
        <CodeSpan color={codeSurface.string}>
          &apos;{line.message}&apos;
        </CodeSpan>
        <CodeSpan color={codeSurface.accent}>)</CodeSpan>
      </>
    ) : line.kind === 'navigate' ? (
      <>
        <CodeSpan color={codeSurface.plain}>await page.goto(</CodeSpan>
        {value('parameter')}
        <CodeSpan color={codeSurface.plain}>)</CodeSpan>
      </>
    ) : line.kind === 'click' ? (
      <>
        <CodeSpan color={codeSurface.plain}>await page.locator(</CodeSpan>
        {value('selector')}
        <CodeSpan color={codeSurface.plain}>).click()</CodeSpan>
      </>
    ) : (
      <>
        <CodeSpan color={codeSurface.plain}>await page.locator(</CodeSpan>
        {value('selector')}
        <CodeSpan color={codeSurface.plain}>).fill(</CodeSpan>
        {value('parameter', line.masked)}
        <CodeSpan color={codeSurface.plain}>)</CodeSpan>
      </>
    )

  const style: CSSProperties = setup ? { opacity: 0.65 } : {}
  return (
    <Box sx={{ pl: editable ? 2.25 : 0, whiteSpace: 'nowrap', ...style }}>
      {setup ? <CodeSpan color={codeSurface.base}>⚙ </CodeSpan> : null}
      {content}
      {running ? null : editable ? null : (
        <CodeSpan color={codeSurface.success}> ✓</CodeSpan>
      )}
    </Box>
  )
}

function CodeComment({ children }: { children: ReactNode }): ReactElement {
  return (
    <Box sx={{ opacity: 0.45 }}>
      <CodeSpan color={codeSurface.base} italic>
        {children}
      </CodeSpan>
    </Box>
  )
}

/** The collapsed live-progress strip under the browser pane. */
export function TestDocumentStrip({
  awaitingUser,
  lastTaskStepCount,
  onExpand,
  pendingRow,
  progressDocument,
  running,
  setupStepCount
}: {
  awaitingUser: boolean
  lastTaskStepCount?: number
  onExpand: () => void
  pendingRow?: RunTraceRow
  progressDocument: LiveTestProgressDocument
  running: boolean
  setupStepCount: number
}): ReactElement {
  const steps = progressDocument.steps
  const previewSteps = steps.slice(-3)
  const previewStart = steps.length - previewSteps.length
  const pendingLine = running ? pendingSpecLine(pendingRow) : undefined

  return (
    <Box
      component="section"
      sx={{ borderColor: 'divider', borderTop: 1, px: 2, py: 1.5 }}
    >
      <Stack
        alignItems="center"
        direction="row"
        spacing={1}
        sx={{ cursor: 'pointer', mb: 1 }}
        onClick={onExpand}
      >
        <Typography component="span" sx={microLabelSx}>
          live test progress
        </Typography>
        <StatusTag tone="accent">{specFileName}</StatusTag>
        <Box sx={{ flex: 1 }} />
        <Typography
          component="span"
          sx={{
            color: 'rgba(28, 35, 48, 0.7)',
            fontFamily: monoFontFamily,
            fontSize: '11px'
          }}
        >
          {documentStatusLine({
            awaitingUser,
            lastTaskStepCount,
            running,
            setupStepCount,
            stepCount: steps.length
          })}
        </Typography>
        <Button
          onClick={(event) => {
            event.stopPropagation()
            onExpand()
          }}
          size="small"
          startIcon={<UnfoldMore fontSize="small" />}
          sx={{ fontSize: '11px', py: 0.25 }}
          variant="outlined"
        >
          Document view
        </Button>
      </Stack>
      <CodeBlock>
        {steps.length === 0 && !pendingLine ? (
          <CodeComment>
            {'// setup writes the opening lines when it runs'}
          </CodeComment>
        ) : (
          <>
            {previewStart > 0 ? (
              <CodeComment>
                {`// ${previewStart} earlier line${previewStart === 1 ? '' : 's'}`}
              </CodeComment>
            ) : null}
            {previewSteps.map((step, index) => (
              <SpecStepCode
                editable={false}
                key={previewStart + index}
                position={previewStart + index + 1}
                setup={previewStart + index < setupStepCount}
                step={step}
              />
            ))}
            {pendingLine ? (
              <Box
                sx={{
                  bgcolor: 'rgba(224, 165, 58, 0.15)',
                  mx: -1.5,
                  px: 1.5,
                  whiteSpace: 'nowrap'
                }}
              >
                <CodeSpan color={codeSurface.plain}>{pendingLine}</CodeSpan>
                <CodeSpan color={codeSurface.accent}> ● running</CodeSpan>
              </Box>
            ) : null}
            {!running && awaitingUser ? (
              <CodeComment>
                {'// waiting on your answer — no steps written'}
              </CodeComment>
            ) : null}
            {!running &&
            !awaitingUser &&
            steps.length > 0 &&
            setupStepCount >= steps.length ? (
              <CodeComment>{'// agent lines will append here'}</CodeComment>
            ) : null}
          </>
        )}
      </CodeBlock>
    </Box>
  )
}

function pendingSpecLine(row: RunTraceRow | undefined): string | undefined {
  if (!row || row.state !== 'pending') {
    return undefined
  }
  switch (row.tag) {
    case 'navigate':
      return `await page.goto('${row.label}')`
    case 'click':
      return row.selector
        ? `await page.locator('${row.selector}').click()`
        : `await page.click(${row.label})`
    case 'fill':
      return row.selector
        ? `await page.locator('${row.selector}').fill(…)`
        : `await page.fill(…)`
    default:
      return undefined
  }
}

/**
 * The workspace code panel expanded in place: the spec is primary, the CSV
 * table stays live-viewable behind the small toggle, and the early Playwright
 * check plus downloads live here instead of a separate window.
 */
export function TestDocumentView({
  onAddStep,
  onClose,
  onUpdateStep,
  progressDocument,
  sessionTitle,
  setupStepCount
}: {
  onAddStep: () => void
  onClose: () => void
  onUpdateStep: (
    index: number,
    field: keyof LiveTestProgressStep,
    value: string
  ) => void
  progressDocument: LiveTestProgressDocument
  sessionTitle: string
  setupStepCount: number
}): ReactElement {
  const progress = window.testGen?.liveTestProgress
  const [view, setView] = useState<'spec' | 'csv'>('spec')
  const [playwrightMode, setPlaywrightMode] =
    useState<PlaywrightTestRunMode>('headless')
  const [playwrightRunning, setPlaywrightRunning] = useState(false)
  const [playwrightRun, setPlaywrightRun] = useState<PlaywrightTestRunResult>()

  const steps = progressDocument.steps

  function runPlaywright(): void {
    if (!progress || playwrightRunning || steps.length === 0) {
      return
    }
    setPlaywrightRun(undefined)
    setPlaywrightRunning(true)
    void progress
      .runPlaywright(progressDocument, playwrightMode, sessionTitle)
      .then(setPlaywrightRun)
      .catch((error: unknown) =>
        setPlaywrightRun({
          status: 'failed',
          output: error instanceof Error ? error.message : String(error)
        })
      )
      .finally(() => setPlaywrightRunning(false))
  }

  function downloadSpec(): void {
    downloadFile(
      exportPlaywright(progressDocument, sessionTitle),
      specFileName,
      'text/typescript;charset=utf-8'
    )
  }

  function downloadCsv(): void {
    downloadFile(
      exportCsv(progressDocument),
      'live-test-progress.csv',
      'text/csv;charset=utf-8'
    )
  }

  return (
    <Box
      component="section"
      sx={{
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }}
    >
      <Stack
        alignItems="center"
        direction="row"
        spacing={1}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1.25 }}
      >
        <StatusTag tone="accent">{specFileName}</StatusTag>
        <ToggleButtonGroup
          exclusive
          onChange={(_event, nextView: 'spec' | 'csv' | null) => {
            if (nextView) setView(nextView)
          }}
          size="small"
          value={view}
          sx={{
            '& .MuiToggleButton-root': { fontSize: '10px', px: 1, py: 0.25 }
          }}
        >
          <ToggleButton value="spec">spec</ToggleButton>
          <ToggleButton value="csv">csv</ToggleButton>
        </ToggleButtonGroup>
        <Typography color="text.secondary" sx={{ fontSize: '10.5px' }}>
          {view === 'spec'
            ? 'every line editable — entered values export as-is'
            : 'CSV is secondary — same steps, table form'}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <StatusTag tone="neutral">in-session · not saved</StatusTag>
        <Typography
          component="span"
          sx={{
            color: 'rgba(28, 35, 48, 0.7)',
            fontFamily: monoFontFamily,
            fontSize: '11px'
          }}
        >
          {`${steps.length} step${steps.length === 1 ? '' : 's'}`}
        </Typography>
        <IconButton
          aria-label="Close document view"
          onClick={onClose}
          size="small"
        >
          <Close fontSize="small" />
        </IconButton>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          gap: 1.25,
          minHeight: 0,
          overflowY: 'auto',
          px: 2,
          py: 1.5
        }}
      >
        {view === 'spec' ? (
          <CodeBlock sx={{ flex: 'none' }}>
            <Box sx={{ whiteSpace: 'nowrap' }}>
              <CodeSpan color={codeSurface.keyword}>import</CodeSpan>
              <CodeSpan color={codeSurface.plain}> {'{ test }'} </CodeSpan>
              <CodeSpan color={codeSurface.keyword}>from</CodeSpan>
              <CodeSpan color={codeSurface.string}>
                {" '@playwright/test'"}
              </CodeSpan>
            </Box>
            <Box sx={{ height: 8 }} />
            <Box sx={{ whiteSpace: 'nowrap' }}>
              <CodeSpan color={codeSurface.keyword}>test</CodeSpan>
              <CodeSpan color={codeSurface.plain}>(</CodeSpan>
              <CodeSpan color={codeSurface.string}>
                &apos;{sessionTitle}&apos;
              </CodeSpan>
              <CodeSpan color={codeSurface.plain}>, </CodeSpan>
              <CodeSpan color={codeSurface.keyword}>async</CodeSpan>
              <CodeSpan color={codeSurface.plain}>
                {' ({ page }) => {'}
              </CodeSpan>
            </Box>
            {steps.map((step, index) => (
              <SpecStepCode
                editable
                key={index}
                onUpdate={(field, value) => onUpdateStep(index, field, value)}
                position={index + 1}
                setup={index < setupStepCount}
                step={step}
              />
            ))}
            <Box sx={{ pl: 2.25 }}>
              <CodeComment>{'// assertions are not generated yet'}</CodeComment>
            </Box>
            <Box>
              <CodeSpan color={codeSurface.plain}>{'})'}</CodeSpan>
            </Box>
          </CodeBlock>
        ) : (
          <CsvTable document={progressDocument} onUpdate={onUpdateStep} />
        )}

        <Stack alignItems="center" direction="row" spacing={1.25}>
          <Typography
            color="text.secondary"
            sx={{ flex: 1, fontSize: '10.5px' }}
          >
            A step missing a URL, selector or fill value is written into the
            spec as an explicit error rather than silently dropped.
          </Typography>
          <Button
            onClick={onAddStep}
            size="small"
            startIcon={<Add fontSize="small" />}
            sx={{ fontSize: '11px' }}
            variant="outlined"
          >
            Add step
          </Button>
        </Stack>

        <Stack
          alignItems="center"
          direction="row"
          spacing={1}
          sx={{ borderColor: 'divider', borderTop: 1, pt: 1.25 }}
        >
          <Typography
            color="text.secondary"
            sx={{ flex: 1, fontSize: '10.5px' }}
          >
            {`Early check — replays the ${steps.length} captured line${steps.length === 1 ? '' : 's'} in a separate Chromium without touching the agent's browser session. Not the final suite run.`}
          </Typography>
          <ToggleButtonGroup
            aria-label="Playwright browser visibility"
            exclusive
            onChange={(_event, mode: PlaywrightTestRunMode | null) => {
              if (mode) setPlaywrightMode(mode)
            }}
            size="small"
            value={playwrightMode}
            sx={{
              '& .MuiToggleButton-root': {
                fontSize: '10.5px',
                px: 1.25,
                py: 0.375
              }
            }}
          >
            <ToggleButton disabled={playwrightRunning} value="headed">
              Headed
            </ToggleButton>
            <ToggleButton disabled={playwrightRunning} value="headless">
              Headless
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            color="success"
            disabled={playwrightRunning || steps.length === 0}
            onClick={runPlaywright}
            size="small"
            startIcon={<PlayArrow fontSize="small" />}
            variant="contained"
          >
            {playwrightRunning ? 'Running…' : 'Run what you have'}
          </Button>
        </Stack>

        {playwrightRun ? (
          <Box>
            <Stack
              alignItems="center"
              direction="row"
              spacing={1}
              sx={{
                bgcolor:
                  playwrightRun.status === 'passed' ? '#e3f4ec' : '#fceceb',
                border: 1,
                borderColor:
                  playwrightRun.status === 'passed'
                    ? 'rgba(23, 116, 73, 0.25)'
                    : 'rgba(179, 54, 46, 0.25)',
                borderRadius: '8px',
                mb: 1,
                px: 1.5,
                py: 1
              }}
            >
              <StatusTag
                tone={playwrightRun.status === 'passed' ? 'success' : 'danger'}
              >
                {playwrightRun.status === 'passed' ? 'PASS' : 'FAIL'}
              </StatusTag>
              <Typography
                sx={{
                  color:
                    playwrightRun.status === 'passed' ? '#177449' : '#b3362e',
                  fontSize: '11.5px',
                  fontWeight: 600
                }}
              >
                {playwrightRun.status === 'passed'
                  ? 'Playwright test passed'
                  : 'Playwright test failed'}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Typography
                sx={{
                  color: 'rgba(28, 35, 48, 0.5)',
                  fontFamily: monoFontFamily,
                  fontSize: '10px'
                }}
              >
                {`${playwrightMode} chromium`}
              </Typography>
            </Stack>
            <CodeBlock>
              <Box
                component="pre"
                sx={{ m: 0, whiteSpace: 'pre-wrap', ...codeTextSx }}
              >
                {playwrightRun.output}
              </Box>
            </CodeBlock>
          </Box>
        ) : null}

        <Stack alignItems="center" direction="row" spacing={1}>
          <Button
            disabled={steps.length === 0}
            onClick={downloadSpec}
            size="small"
            startIcon={<Download fontSize="small" />}
            variant="contained"
          >
            Download spec.ts
          </Button>
          <Button
            disabled={steps.length === 0}
            onClick={downloadCsv}
            size="small"
            startIcon={<Download fontSize="small" />}
            sx={{ opacity: 0.75 }}
            variant="outlined"
          >
            CSV
          </Button>
          <Typography
            color="text.secondary"
            sx={{ flex: 1, fontSize: '10.5px', textAlign: 'right' }}
          >
            Nothing is persisted — the document clears when the app closes.
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}

function CsvTable({
  document,
  onUpdate
}: {
  document: LiveTestProgressDocument
  onUpdate: (
    index: number,
    field: keyof LiveTestProgressStep,
    value: string
  ) => void
}): ReactElement {
  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        flex: 'none',
        overflowX: 'auto'
      }}
    >
      <Table
        size="small"
        sx={{
          minWidth: 980,
          '& .MuiTableCell-root': {
            borderBottom: 1,
            borderColor: 'divider',
            borderRight: 1,
            p: 0
          },
          '& .MuiTableCell-root:last-child': { borderRight: 0 },
          '& .MuiTableHead-root .MuiTableCell-root': {
            bgcolor: 'grey.100',
            fontWeight: 700,
            px: 1.25,
            py: 1
          },
          '& .MuiTableBody-root .MuiTableRow-root:hover': {
            bgcolor: 'action.hover'
          }
        }}
      >
        <TableHead>
          <TableRow>
            {[
              'StepNo',
              'Description',
              'Action',
              'Selector',
              'Parameter',
              'Additional Parameter',
              'Comments'
            ].map((label) => (
              <TableCell key={label}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {document.steps.map((step, index) => (
            <TableRow key={index}>
              <EditableCell
                onChange={(value) => onUpdate(index, 'stepNo', value)}
                value={String(step.stepNo)}
              />
              <EditableCell
                onChange={(value) => onUpdate(index, 'description', value)}
                value={step.description}
              />
              <EditableCell
                onChange={(value) => onUpdate(index, 'action', value)}
                value={step.action}
              />
              <EditableCell
                onChange={(value) => onUpdate(index, 'selector', value)}
                value={step.selector}
              />
              <EditableCell
                onChange={(value) => onUpdate(index, 'parameter', value)}
                value={step.parameter}
              />
              <EditableCell
                onChange={(value) =>
                  onUpdate(index, 'additionalParameter', value)
                }
                value={step.additionalParameter}
              />
              <EditableCell
                onChange={(value) => onUpdate(index, 'comments', value)}
                value={step.comments}
              />
            </TableRow>
          ))}
          {document.steps.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ px: 1.25, py: 1 }}>
                Confirmed browser actions will appear here.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Paper>
  )
}

function EditableCell({
  onChange,
  value
}: {
  onChange: (value: string) => void
  value: string
}): ReactElement {
  return (
    <TableCell>
      <InputBase
        fullWidth
        onChange={(event) => onChange(event.target.value)}
        sx={{
          '& input': {
            fontSize: '0.8125rem',
            px: 1.25,
            py: 1
          },
          '&:focus-within': {
            boxShadow: (theme) =>
              `inset 0 0 0 2px ${theme.palette.primary.main}`
          }
        }}
        value={value}
      />
    </TableCell>
  )
}
