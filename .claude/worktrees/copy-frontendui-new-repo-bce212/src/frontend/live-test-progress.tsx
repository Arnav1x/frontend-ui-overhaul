import { Download, PlayArrow } from '@mui/icons-material'
import {
  Box,
  Button,
  CssBaseline,
  InputBase,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { useEffect, useState, type ReactElement } from 'react'

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
import { applicationTheme } from './app-theme'

export function LiveTestProgress(): ReactElement {
  const progress = window.testGen?.liveTestProgress
  const [progressDocument, setProgressDocument] =
    useState<LiveTestProgressDocument>({ steps: [] })
  const [view, setView] = useState<'csv' | 'playwright'>('csv')
  const [playwrightRun, setPlaywrightRun] = useState<PlaywrightTestRunResult>()
  const [playwrightRunning, setPlaywrightRunning] = useState(false)
  const [playwrightMode, setPlaywrightMode] =
    useState<PlaywrightTestRunMode>('headless')

  useEffect(() => {
    if (!progress) return
    void progress.getDocument().then(setProgressDocument)
    return progress.onDocumentChange(setProgressDocument)
  }, [progress])

  function updateStep(
    index: number,
    field: keyof LiveTestProgressStep,
    value: string
  ): void {
    const steps = progressDocument.steps.map((step, currentIndex) =>
      currentIndex === index
        ? {
            ...step,
            [field]: field === 'stepNo' ? Number(value) : value
          }
        : step
    )
    const updated = { steps }
    setProgressDocument(updated)
    void progress?.updateDocument(updated).catch(() => undefined)
  }

  function downloadCsv(): void {
    downloadFile(
      exportCsv(progressDocument),
      'live-test-progress.csv',
      'text/csv;charset=utf-8'
    )
  }

  function downloadPlaywright(): void {
    downloadFile(
      exportPlaywright(progressDocument),
      'live-test-progress.spec.ts',
      'text/typescript;charset=utf-8'
    )
  }

  function runPlaywright(): void {
    if (!progress || playwrightRunning) return

    setPlaywrightRun(undefined)
    setPlaywrightRunning(true)
    void progress
      .runPlaywright(progressDocument, playwrightMode)
      .then(setPlaywrightRun)
      .catch((error: unknown) =>
        setPlaywrightRun({
          status: 'failed',
          output: error instanceof Error ? error.message : String(error)
        })
      )
      .finally(() => setPlaywrightRunning(false))
  }

  function downloadFile(content: string, fileName: string, type: string): void {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  const isCsvView = view === 'csv'

  return (
    <ThemeProvider theme={applicationTheme}>
      <CssBaseline />
      <Box component="main" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
          >
            <Box>
              <Typography component="h1" variant="h5">
                Live Test Progress
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Confirmed steps append while AI runs. Changes are kept only for
                this application session.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <ToggleButtonGroup
                aria-label="Output format preview"
                exclusive
                onChange={(_event, nextView: 'csv' | 'playwright' | null) => {
                  if (nextView) setView(nextView)
                }}
                size="small"
                value={view}
              >
                <ToggleButton value="csv">CSV</ToggleButton>
                <ToggleButton value="playwright">Playwright</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
          {isCsvView ? (
            <CsvTable document={progressDocument} onUpdate={updateStep} />
          ) : (
            <Paper
              component="pre"
              elevation={0}
              sx={{
                bgcolor: 'grey.900',
                border: 1,
                borderColor: 'divider',
                color: 'grey.100',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                m: 0,
                minHeight: 320,
                overflow: 'auto',
                p: 2
              }}
            >
              {exportPlaywright(progressDocument)}
            </Paper>
          )}
          <Box>
            <Button
              onClick={isCsvView ? downloadCsv : downloadPlaywright}
              startIcon={<Download />}
              variant="contained"
            >
              {isCsvView ? 'Download CSV' : 'Download Playwright'}
            </Button>
            {!isCsvView ? (
              <>
                <Button
                  disabled={
                    playwrightRunning || progressDocument.steps.length === 0
                  }
                  onClick={runPlaywright}
                  startIcon={<PlayArrow />}
                  sx={{ ml: 1 }}
                  variant="contained"
                >
                  {playwrightRunning
                    ? 'Running Playwright'
                    : `Run ${playwrightMode === 'headed' ? 'Headed' : 'Headless'} Playwright`}
                </Button>
                <ToggleButtonGroup
                  aria-label="Playwright browser visibility"
                  exclusive
                  onChange={(_event, mode: PlaywrightTestRunMode | null) => {
                    if (mode) setPlaywrightMode(mode)
                  }}
                  size="small"
                  sx={{ ml: 1 }}
                  value={playwrightMode}
                >
                  <ToggleButton disabled={playwrightRunning} value="headless">
                    Headless
                  </ToggleButton>
                  <ToggleButton disabled={playwrightRunning} value="headed">
                    Headed
                  </ToggleButton>
                </ToggleButtonGroup>
              </>
            ) : null}
          </Box>
          {playwrightRun ? (
            <Paper
              component="section"
              elevation={0}
              sx={{ border: 1, borderColor: 'divider', p: 2 }}
            >
              <Typography
                color={
                  playwrightRun.status === 'passed' ? 'success.main' : 'error'
                }
                variant="subtitle2"
              >
                {playwrightRun.status === 'passed'
                  ? 'Playwright test passed'
                  : 'Playwright test failed'}
              </Typography>
              <Typography
                component="pre"
                sx={{ mb: 0, mt: 1, overflow: 'auto', whiteSpace: 'pre-wrap' }}
                variant="caption"
              >
                {playwrightRun.output}
              </Typography>
            </Paper>
          ) : null}
        </Stack>
      </Box>
    </ThemeProvider>
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
      sx={{ border: 1, borderColor: 'divider', overflowX: 'auto' }}
    >
      <Table
        size="small"
        sx={{
          minWidth: 1180,
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
              <TableCell colSpan={7}>
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
