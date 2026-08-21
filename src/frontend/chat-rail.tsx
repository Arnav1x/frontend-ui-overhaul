import { ArrowUpward, PlayArrow } from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useRef, useState, type ReactElement } from 'react'

import type { BrowserExecutionAgentRunResult } from '../authoring/browser-execution-agent-run-result'
import type { LiveTestProgressStep } from '../authoring/live-test-progress'
import { microLabelSx, monoFontFamily, codeSurface } from './app-theme'
import type { RunTraceRow, RunTraceTag } from './run-trace-presentation'
import {
  stoppedReasonLabel,
  type ComposerPresentation,
  type StatusTone
} from './session-lifecycle'
import { setupPreconfigs } from './setup-preconfig'
import { stepSummary } from './spec-presentation'
import { StatusTag } from './status-tag'

const specFileName = 'live-test-progress.spec.ts'

export type ChatEntry =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'receipt'; text: string }
  | { id: string; kind: 'question'; text: string; actionsConfirmed: number }
  | {
      id: string
      kind: 'result'
      result: BrowserExecutionAgentRunResult
      steps: readonly LiveTestProgressStep[]
      stepsWritten: number
    }

export type RailTab = 'chat' | 'setup'

const traceTagTone: Record<RunTraceTag, StatusTone> = {
  observe: 'neutral',
  navigate: 'accent',
  click: 'success',
  fill: 'active',
  wait: 'neutral',
  upload: 'neutral',
  tool: 'neutral'
}

export function ChatRail({
  activeTab,
  browserReady,
  composer,
  entries,
  onOpenUrl,
  onRespond,
  onRunSetup,
  onSubmitTask,
  onTabChange,
  running,
  setupBusy,
  setupComplete,
  setupError,
  traceRows
}: {
  activeTab: RailTab
  browserReady: boolean
  composer: ComposerPresentation
  entries: readonly ChatEntry[]
  onOpenUrl: (url: string) => Promise<string | undefined>
  onRespond: (response: string) => void
  onRunSetup: () => void
  onSubmitTask: (instruction: string) => void
  onTabChange: (tab: RailTab) => void
  running: boolean
  setupBusy: boolean
  setupComplete: boolean
  setupError?: string
  traceRows: readonly RunTraceRow[]
}): ReactElement {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: '#fbfbfc',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0
      }}
    >
      <Stack direction="row" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        {(['chat', 'setup'] as const).map((tab) => (
          <Box
            component="button"
            key={tab}
            onClick={() => onTabChange(tab)}
            sx={{
              alignItems: 'center',
              bgcolor: 'transparent',
              border: 0,
              borderBottom: 2,
              borderColor: activeTab === tab ? 'primary.main' : 'transparent',
              color:
                activeTab === tab ? 'primary.main' : 'rgba(28, 35, 48, 0.45)',
              cursor: 'pointer',
              display: 'flex',
              flex: 1,
              fontFamily: 'inherit',
              fontSize: '11px',
              fontWeight: 600,
              gap: 0.75,
              justifyContent: 'center',
              py: 1.125
            }}
          >
            {tab === 'chat' ? 'Chat' : 'Setup'}
            {tab === 'setup' && setupComplete ? (
              <StatusTag tone="success">✓</StatusTag>
            ) : null}
          </Box>
        ))}
      </Stack>

      {activeTab === 'chat' ? (
        <ChatView
          composer={composer}
          entries={entries}
          onRespond={onRespond}
          onSubmitTask={onSubmitTask}
          running={running}
          traceRows={traceRows}
        />
      ) : (
        <SetupView
          browserReady={browserReady}
          onOpenUrl={onOpenUrl}
          onRunSetup={onRunSetup}
          running={running}
          setupBusy={setupBusy}
          setupComplete={setupComplete}
          setupError={setupError}
        />
      )}
    </Box>
  )
}

function ChatView({
  composer,
  entries,
  onRespond,
  onSubmitTask,
  running,
  traceRows
}: {
  composer: ComposerPresentation
  entries: readonly ChatEntry[]
  onRespond: (response: string) => void
  onSubmitTask: (instruction: string) => void
  running: boolean
  traceRows: readonly RunTraceRow[]
}): ReactElement {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node) {
      node.scrollTop = node.scrollHeight
    }
  }, [entries.length, traceRows.length, running])

  function submit(): void {
    const text = draft.trim()
    if (!text) {
      return
    }
    if (composer.mode === 'answer') {
      onRespond(text)
    } else {
      onSubmitTask(text)
    }
    setDraft('')
  }

  const lastEntry = entries[entries.length - 1]
  const showNextStepsHint =
    !running &&
    lastEntry?.kind === 'result' &&
    lastEntry.result.status === 'completed'

  return (
    <>
      <Box
        aria-live="polite"
        component="section"
        ref={scrollRef}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, py: 1.5 }}
      >
        <Stack spacing={1.125}>
          {entries.map((entry) => (
            <ChatEntryView entry={entry} key={entry.id} />
          ))}
          {running ? <RunTraceList rows={traceRows} /> : null}
          {showNextStepsHint ? (
            <Typography
              sx={{
                color: 'rgba(28, 35, 48, 0.45)',
                fontSize: '11px',
                px: 0.25
              }}
            >
              Provide next steps
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        sx={{ borderColor: 'divider', borderTop: 1, px: 1.5, py: 1.25 }}
      >
        {composer.mode === 'answer' ? (
          <Stack spacing={0.875}>
            <TextField
              autoFocus
              fullWidth
              multiline
              maxRows={4}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit()
                }
              }}
              placeholder={composer.placeholder}
              size="small"
              value={draft}
            />
            <Button
              disabled={!draft.trim()}
              fullWidth
              size="small"
              type="submit"
              variant="contained"
            >
              Continue
            </Button>
          </Stack>
        ) : (
          <Stack
            direction="row"
            spacing={1}
            sx={{ opacity: composer.mode === 'locked' ? 0.55 : 1 }}
          >
            <TextField
              disabled={composer.mode === 'locked'}
              fullWidth
              multiline
              maxRows={4}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit()
                }
              }}
              placeholder={composer.placeholder}
              size="small"
              value={draft}
            />
            <Button
              aria-label="Send task"
              disabled={composer.mode === 'locked' || !draft.trim()}
              sx={{ minWidth: 40, px: 0 }}
              type="submit"
              variant="contained"
            >
              {running ? (
                <CircularProgress color="inherit" size={16} />
              ) : (
                <ArrowUpward fontSize="small" />
              )}
            </Button>
          </Stack>
        )}
        <Typography
          sx={{
            color: 'rgba(28, 35, 48, 0.55)',
            fontSize: '10.5px',
            mt: 0.875
          }}
        >
          {composer.hint}
        </Typography>
      </Box>
    </>
  )
}

function ChatEntryView({ entry }: { entry: ChatEntry }): ReactElement {
  switch (entry.kind) {
    case 'user':
      return (
        <Box
          sx={{
            alignSelf: 'flex-end',
            bgcolor: 'primary.main',
            borderRadius: '10px 10px 2px 10px',
            color: '#fff',
            fontSize: '11.5px',
            lineHeight: 1.5,
            maxWidth: '92%',
            px: 1.25,
            py: 0.875
          }}
        >
          {entry.text}
        </Box>
      )
    case 'receipt':
      return (
        <Box
          sx={{
            alignSelf: 'center',
            bgcolor: '#e3f4ec',
            border: '1px solid rgba(23, 116, 73, 0.2)',
            borderRadius: 999,
            color: '#177449',
            fontSize: '10.5px',
            px: 1.5,
            py: 0.375
          }}
        >
          {entry.text}
        </Box>
      )
    case 'question':
      return (
        <Stack spacing={0.625} sx={{ alignSelf: 'stretch' }}>
          {entry.actionsConfirmed > 0 ? (
            <Stack alignItems="center" direction="row" spacing={0.75}>
              <Box
                sx={{
                  bgcolor: '#1f9d61',
                  borderRadius: '50%',
                  height: 8,
                  width: 8
                }}
              />
              <Typography sx={{ fontSize: '11px' }}>
                {`${entry.actionsConfirmed} browser action${entry.actionsConfirmed === 1 ? '' : 's'} confirmed`}
              </Typography>
            </Stack>
          ) : null}
          <Box
            sx={{
              bgcolor: '#fdf1e0',
              border: '1px solid rgba(165, 94, 10, 0.25)',
              borderRadius: '10px 10px 10px 2px',
              maxWidth: '94%',
              px: 1.375,
              py: 1.125
            }}
          >
            <StatusTag tone="active">question</StatusTag>
            <Typography
              sx={{
                color: '#7a4708',
                fontSize: '11.5px',
                lineHeight: 1.5,
                mt: 0.75
              }}
            >
              {entry.text}
            </Typography>
          </Box>
        </Stack>
      )
    case 'result':
      return <ResultBubble entry={entry} />
  }
}

function ResultBubble({
  entry
}: {
  entry: Extract<ChatEntry, { kind: 'result' }>
}): ReactElement {
  const { result } = entry
  const failed = result.status === 'failed' || result.status === 'rejected'

  return (
    <Box
      sx={{
        bgcolor: failed ? '#fceceb' : 'background.paper',
        border: failed
          ? '1px solid rgba(179, 54, 46, 0.25)'
          : '1px solid rgba(28, 35, 48, 0.1)',
        borderRadius: '10px 10px 10px 2px',
        maxWidth: '94%',
        px: 1.375,
        py: 1.125
      }}
    >
      {result.status === 'completed' ? (
        <StatusTag tone="success">Completed</StatusTag>
      ) : result.status === 'stopped' ? (
        <StatusTag tone="active">
          {`Stopped · ${stoppedReasonLabel(result.reason)}`}
        </StatusTag>
      ) : (
        <StatusTag tone="danger">Failed</StatusTag>
      )}
      <Typography
        sx={{
          color: failed ? '#7c2723' : 'text.primary',
          fontSize: '11.5px',
          lineHeight: 1.5,
          mt: 0.75,
          whiteSpace: 'pre-wrap'
        }}
      >
        {resultDetail(result)}
      </Typography>
      {result.status === 'completed' && entry.steps.length > 0 ? (
        <Stack
          spacing={0.625}
          sx={{
            borderColor: 'rgba(28, 35, 48, 0.08)',
            borderTop: 1,
            mt: 1.125,
            pt: 1.125
          }}
        >
          {entry.steps.map((step, index) => {
            const summary = stepSummary(step)
            return (
              <Stack
                alignItems="baseline"
                direction="row"
                key={index}
                spacing={0.875}
              >
                <StatusTag tone={traceTagTone[summary.tag]}>
                  {summary.tag}
                </StatusTag>
                <Typography
                  sx={{
                    fontSize: '11px',
                    overflowWrap: 'anywhere'
                  }}
                >
                  {summary.text}
                </Typography>
              </Stack>
            )
          })}
        </Stack>
      ) : null}
      {result.status !== 'rejected' ? (
        <Stack
          alignItems="center"
          direction="row"
          spacing={0.75}
          sx={{
            borderColor: failed
              ? 'rgba(179, 54, 46, 0.15)'
              : 'rgba(28, 35, 48, 0.08)',
            borderTop: 1,
            mt: 1.125,
            pt: 1.125
          }}
        >
          <Typography
            sx={{
              color: 'rgba(28, 35, 48, 0.5)',
              flex: 1,
              fontSize: '10.5px'
            }}
          >
            {`${entry.stepsWritten} step${entry.stepsWritten === 1 ? '' : 's'} written to `}
            <Box component="span" sx={{ fontFamily: monoFontFamily }}>
              {specFileName}
            </Box>
          </Typography>
          {entry.stepsWritten > 0 ? (
            <StatusTag tone="success">✓ saved</StatusTag>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  )
}

function resultDetail(result: BrowserExecutionAgentRunResult): string {
  switch (result.status) {
    case 'completed':
      return result.output
    case 'awaiting_user':
      return result.question
    case 'stopped':
      return result.message ?? stoppedDetail(result.reason)
    case 'rejected':
    case 'failed':
      return result.message
  }
}

function stoppedDetail(
  reason: Extract<
    BrowserExecutionAgentRunResult,
    { status: 'stopped' }
  >['reason']
): string {
  switch (reason) {
    case 'call_limit_reached':
      return 'The run hit the runaway-call backstop and stopped. Steps confirmed before the stop are kept.'
    case 'model_finished_without_action':
      return 'The agent decided nothing more was needed but could not confirm success, so it stopped rather than guess.'
    case 'multiple_tool_calls_requested':
      return 'The agent requested more than one browser tool in a single turn, so the run stopped as a guardrail.'
    case 'user_requested':
      return 'You stopped the run. Steps confirmed before the stop are kept.'
  }
}

function RunTraceList({
  rows
}: {
  rows: readonly RunTraceRow[]
}): ReactElement {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())

  function toggle(id: number): void {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <Stack spacing={0.625}>
      {rows.map((row) => (
        <Stack key={row.id} spacing={0.5}>
          <Stack alignItems="baseline" direction="row" spacing={0.75}>
            {row.state === 'pending' ? (
              <Box
                sx={{
                  alignSelf: 'center',
                  bgcolor: '#e0a53a',
                  borderRadius: '50%',
                  flex: 'none',
                  height: 8,
                  width: 8
                }}
              />
            ) : (
              <Box
                aria-label={
                  expanded.has(row.id) ? 'Collapse payload' : 'Expand payload'
                }
                component="button"
                onClick={() => toggle(row.id)}
                sx={{
                  bgcolor: 'transparent',
                  border: 0,
                  color: 'rgba(28, 35, 48, 0.35)',
                  cursor: row.detail.length > 0 ? 'pointer' : 'default',
                  fontFamily: monoFontFamily,
                  fontSize: '10px',
                  p: 0
                }}
              >
                {row.detail.length > 0
                  ? expanded.has(row.id)
                    ? '▾'
                    : '▸'
                  : '·'}
              </Box>
            )}
            <StatusTag
              tone={row.state === 'failed' ? 'danger' : traceTagTone[row.tag]}
            >
              {row.tag}
            </StatusTag>
            <Typography
              sx={{
                color:
                  row.state === 'pending'
                    ? '#a55e0a'
                    : row.tag === 'observe'
                      ? 'rgba(28, 35, 48, 0.5)'
                      : 'text.primary',
                fontSize: '11px',
                overflowWrap: 'anywhere'
              }}
            >
              {row.label}
            </Typography>
          </Stack>
          {expanded.has(row.id) && row.detail.length > 0 ? (
            <Box
              sx={{
                bgcolor: codeSurface.background,
                borderRadius: '6px',
                color: codeSurface.plain,
                fontFamily: monoFontFamily,
                fontSize: '9.5px',
                lineHeight: 1.8,
                ml: 2.5,
                overflowX: 'auto',
                px: 1.125,
                py: 0.875
              }}
            >
              {row.detail.map((line, index) => (
                <Box key={index} sx={{ whiteSpace: 'pre' }}>
                  {line}
                </Box>
              ))}
            </Box>
          ) : null}
        </Stack>
      ))}
      {rows.length === 0 ? (
        <Stack alignItems="center" direction="row" spacing={1}>
          <CircularProgress size={14} />
          <Typography sx={{ color: 'rgba(28, 35, 48, 0.5)', fontSize: '11px' }}>
            observing the page…
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  )
}

function SetupView({
  browserReady,
  onOpenUrl,
  onRunSetup,
  running,
  setupBusy,
  setupComplete,
  setupError
}: {
  browserReady: boolean
  onOpenUrl: (url: string) => Promise<string | undefined>
  onRunSetup: () => void
  running: boolean
  setupBusy: boolean
  setupComplete: boolean
  setupError?: string
}): ReactElement {
  const [url, setUrl] = useState('')
  const [urlBusy, setUrlBusy] = useState(false)
  const [urlError, setUrlError] = useState<string>()
  const preconfig = setupPreconfigs[0]
  const environment = preconfig.environments[0]
  const account = environment.accounts[0]

  function openUrl(): void {
    const target = url.trim()
    if (!target || urlBusy || !browserReady) {
      return
    }
    setUrlBusy(true)
    setUrlError(undefined)
    void onOpenUrl(target)
      .then((error) => {
        setUrlError(error)
        if (!error) {
          setUrl('')
        }
      })
      .finally(() => setUrlBusy(false))
  }

  const selectSx = {
    bgcolor: 'background.paper',
    fontSize: '11.5px',
    '& .MuiSelect-select': { py: 0.875 }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        gap: 1.75,
        minHeight: 0,
        overflowY: 'auto',
        p: 1.75
      }}
    >
      <Stack spacing={0.75}>
        <Typography component="span" sx={microLabelSx}>
          open a url
        </Typography>
        <Stack direction="row" spacing={0.875}>
          <TextField
            disabled={!browserReady || urlBusy}
            fullWidth
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                openUrl()
              }
            }}
            placeholder="https://…"
            size="small"
            value={url}
            sx={{
              '& input': { fontFamily: monoFontFamily, fontSize: '11.5px' }
            }}
          />
          <Button
            disabled={!browserReady || urlBusy || !url.trim()}
            onClick={openUrl}
            size="small"
            variant="contained"
          >
            {urlBusy ? <CircularProgress color="inherit" size={14} /> : 'Go'}
          </Button>
        </Stack>
        {urlError ? (
          <Typography color="error" sx={{ fontSize: '10.5px' }}>
            {urlError}
          </Typography>
        ) : null}
      </Stack>

      <Box sx={{ bgcolor: 'rgba(28, 35, 48, 0.1)', height: '1px' }} />

      <Stack spacing={0.75}>
        <Stack alignItems="center" direction="row" spacing={0.75}>
          <Typography component="span" sx={microLabelSx}>
            preconfigured setup
          </Typography>
          <Box sx={{ flex: 1 }} />
          <StatusTag tone="neutral">Set up in code</StatusTag>
        </Stack>
        <Select fullWidth size="small" sx={selectSx} value={preconfig.id}>
          <MenuItem sx={{ fontSize: '11.5px' }} value={preconfig.id}>
            {preconfig.label}
          </MenuItem>
        </Select>
        <Stack
          spacing={1}
          sx={{
            borderLeft: '2px solid rgba(63, 76, 192, 0.25)',
            mt: 0.5,
            pl: 1.375
          }}
        >
          <Stack spacing={0.5}>
            <Typography component="span" sx={microLabelSx}>
              environment
            </Typography>
            <Select fullWidth size="small" sx={selectSx} value={environment.id}>
              <MenuItem sx={{ fontSize: '11.5px' }} value={environment.id}>
                {environment.label}
              </MenuItem>
            </Select>
          </Stack>
          <Stack spacing={0.5}>
            <Typography component="span" sx={microLabelSx}>
              account
            </Typography>
            <Select fullWidth size="small" sx={selectSx} value={account.id}>
              <MenuItem sx={{ fontSize: '11.5px' }} value={account.id}>
                {account.label}
              </MenuItem>
            </Select>
          </Stack>
        </Stack>
      </Stack>

      <Button
        disabled={!browserReady || setupBusy || setupComplete || running}
        fullWidth
        onClick={onRunSetup}
        startIcon={
          setupBusy ? (
            <CircularProgress color="inherit" size={14} />
          ) : (
            <PlayArrow fontSize="small" />
          )
        }
        variant="contained"
      >
        {setupComplete
          ? 'Setup complete'
          : setupBusy
            ? 'Running setup…'
            : 'Run setup'}
      </Button>
      {setupError ? (
        <Typography color="error" sx={{ fontSize: '10.5px' }}>
          {setupError}
        </Typography>
      ) : null}
      {!browserReady ? (
        <Typography color="text.secondary" sx={{ fontSize: '10.5px' }}>
          Setup unlocks when the browser is ready.
        </Typography>
      ) : null}
    </Box>
  )
}
