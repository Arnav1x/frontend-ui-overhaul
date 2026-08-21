import {
  ArrowDropDown,
  Download,
  InfoOutlined,
  RestartAlt,
  Stop
} from '@mui/icons-material'
import {
  Box,
  Button,
  CssBaseline,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Stack,
  ThemeProvider,
  Typography
} from '@mui/material'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement
} from 'react'

import type {
  BrowserExecutionAgentRunResult,
  BrowserExecutionTraceEvent
} from '../authoring/browser-execution-agent-run-result'
import type { LiveTestProgressDocument } from '../authoring/live-test-progress'
import type { BrowserSessionStatus } from '../browser/browser-session'
import { exportCsv } from '../exporters/csv-exporter'
import { exportPlaywright } from '../exporters/playwright-exporter'
import { applicationTheme } from './app-theme'
import { ChatRail, type ChatEntry, type RailTab } from './chat-rail'
import { downloadFile } from './download-file'
import { runTraceRows } from './run-trace-presentation'
import { composerPresentation, sessionLifecycleChip } from './session-lifecycle'
import { StatusTag } from './status-tag'
import { TestDocumentStrip, TestDocumentView } from './test-document-panel'

const defaultSessionTitle = 'Untitled test'

export function App(): ReactElement {
  const application = window.testGen?.application
  const browser = window.testGen?.browser
  const aiAuthoring = window.testGen?.aiAuthoring
  const liveTestProgress = window.testGen?.liveTestProgress

  const workspaceRef = useRef<HTMLDivElement>(null)
  const documentRef = useRef<LiveTestProgressDocument>({ steps: [] })
  const runStartCountRef = useRef(0)
  const entryIdRef = useRef(0)

  const [sessionTitle, setSessionTitle] = useState(defaultSessionTitle)
  const [browserStatus, setBrowserStatus] = useState<BrowserSessionStatus>(
    browser
      ? { state: 'starting' }
      : { state: 'failed', detail: 'Secure Electron bridge is unavailable.' }
  )
  const [progressDocument, setProgressDocument] =
    useState<LiveTestProgressDocument>({ steps: [] })
  const [setupStepCount, setSetupStepCount] = useState(0)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupBusy, setSetupBusy] = useState(false)
  const [setupError, setSetupError] = useState<string>()
  const [railTab, setRailTab] = useState<RailTab>('setup')
  const [entries, setEntries] = useState<readonly ChatEntry[]>([])
  const [running, setRunning] = useState(false)
  const [awaitingUser, setAwaitingUser] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [lastResultStatus, setLastResultStatus] =
    useState<BrowserExecutionAgentRunResult['status']>()
  const [lastTaskStepCount, setLastTaskStepCount] = useState<number>()
  const [traceEvents, setTraceEvents] = useState<
    readonly BrowserExecutionTraceEvent[]
  >([])
  const [docViewOpen, setDocViewOpen] = useState(false)
  const [directToolsAvailable, setDirectToolsAvailable] = useState(false)
  const [agentTestingConsoleAvailable, setAgentTestingConsoleAvailable] =
    useState(false)
  const [exportAnchor, setExportAnchor] = useState<HTMLElement>()
  const [legacyAnchor, setLegacyAnchor] = useState<HTMLElement>()

  function applyDocument(document: LiveTestProgressDocument): void {
    documentRef.current = document
    setProgressDocument(document)
  }

  useEffect(() => {
    if (!application) {
      return
    }
    void application
      .getConfiguration()
      .then((configuration) => {
        setAgentTestingConsoleAvailable(
          configuration.agentTestingConsoleAvailable
        )
        setDirectToolsAvailable(configuration.directToolsAvailable)
      })
      .catch(() => {
        setAgentTestingConsoleAvailable(false)
        setDirectToolsAvailable(false)
      })
  }, [application])

  useEffect(() => {
    if (!browser) {
      return
    }
    const unsubscribe = browser.onStatusChange(setBrowserStatus)
    void browser
      .getStatus()
      .then(setBrowserStatus)
      .catch(() =>
        setBrowserStatus({
          state: 'failed',
          detail: 'Browser-session status is unavailable.'
        })
      )
    return unsubscribe
  }, [browser])

  useEffect(() => {
    if (!liveTestProgress) {
      return
    }
    void liveTestProgress
      .getDocument()
      .then(applyDocument)
      .catch(() => undefined)
    return liveTestProgress.onDocumentChange(applyDocument)
  }, [liveTestProgress])

  useEffect(() => {
    if (!aiAuthoring) {
      return
    }
    return aiAuthoring.onTraceEvent((event) =>
      setTraceEvents((current) => [...current, event])
    )
  }, [aiAuthoring])

  const browserVisible =
    (browserStatus.state === 'ready' || browserStatus.state === 'navigating') &&
    !docViewOpen

  useLayoutEffect(() => {
    const workspace = workspaceRef.current
    if (!browser || !workspace) {
      return
    }

    const reportBounds = (): void => {
      const bounds = workspace.getBoundingClientRect()
      // Moving the native browser view off-screen (same size, so the page
      // never reflows) lets the DOM underneath show status and document views.
      void browser.setWorkspaceBounds({
        height: bounds.height,
        width: bounds.width,
        x: browserVisible ? bounds.x : bounds.x - 100000,
        y: bounds.y
      })
    }
    const resizeObserver = new ResizeObserver(reportBounds)
    resizeObserver.observe(workspace)
    window.addEventListener('resize', reportBounds)
    window.addEventListener('scroll', reportBounds, true)
    reportBounds()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', reportBounds)
      window.removeEventListener('scroll', reportBounds, true)
    }
  }, [browser, browserVisible])

  const traceRows = useMemo(() => runTraceRows(traceEvents), [traceEvents])
  const pendingRow =
    traceRows.length > 0 && traceRows[traceRows.length - 1].state === 'pending'
      ? traceRows[traceRows.length - 1]
      : undefined

  const lifecycle = sessionLifecycleChip({
    awaitingUser,
    lastResultStatus,
    running,
    setupComplete
  })
  const composer = composerPresentation({
    aiAuthoringAvailable: Boolean(aiAuthoring),
    awaitingUser,
    browserState: browserStatus.state,
    lastResultStatus,
    running,
    setupComplete
  })

  function nextEntryId(prefix: string): string {
    entryIdRef.current += 1
    return `${prefix}-${entryIdRef.current}`
  }

  function handleRunSettled(result: BrowserExecutionAgentRunResult): void {
    const stepsWritten = Math.max(
      documentRef.current.steps.length - runStartCountRef.current,
      0
    )
    setRunning(false)
    setStopping(false)
    setTraceEvents([])
    if (result.status === 'awaiting_user') {
      setAwaitingUser(true)
      setEntries((current) => [
        ...current,
        {
          id: nextEntryId('question'),
          kind: 'question',
          text: result.question,
          actionsConfirmed: stepsWritten
        }
      ])
      return
    }
    setAwaitingUser(false)
    setLastResultStatus(result.status)
    setLastTaskStepCount(stepsWritten)
    setEntries((current) => [
      ...current,
      {
        id: nextEntryId('result'),
        kind: 'result',
        result,
        steps: documentRef.current.steps.slice(runStartCountRef.current),
        stepsWritten
      }
    ])
  }

  function submitTask(instruction: string): void {
    if (!aiAuthoring || running || awaitingUser) {
      return
    }
    runStartCountRef.current = documentRef.current.steps.length
    setEntries((current) => [
      ...current,
      { id: nextEntryId('user'), kind: 'user', text: instruction }
    ])
    setTraceEvents([])
    setRunning(true)
    setStopping(false)
    void aiAuthoring
      .run(instruction)
      .then(handleRunSettled)
      .catch((error: unknown) =>
        handleRunSettled({
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
          callsUsed: 0
        })
      )
  }

  function respond(response: string): void {
    if (!aiAuthoring || running || !awaitingUser) {
      return
    }
    setEntries((current) => [
      ...current,
      { id: nextEntryId('answer'), kind: 'user', text: response }
    ])
    setAwaitingUser(false)
    setTraceEvents([])
    setRunning(true)
    void aiAuthoring
      .respond(response)
      .then(handleRunSettled)
      .catch((error: unknown) =>
        handleRunSettled({
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
          callsUsed: 0
        })
      )
  }

  function stopRun(): void {
    if (!aiAuthoring || !running || stopping) {
      return
    }
    setStopping(true)
    void aiAuthoring.stop().catch(() => setStopping(false))
  }

  function restartSession(): void {
    if (!application || running || awaitingUser) {
      return
    }
    void application
      .restartSession()
      .then(() => {
        applyDocument({ steps: [] })
        setEntries([])
        setTraceEvents([])
        setSetupComplete(false)
        setSetupError(undefined)
        setSetupStepCount(0)
        setLastResultStatus(undefined)
        setLastTaskStepCount(undefined)
        setAwaitingUser(false)
        setSessionTitle(defaultSessionTitle)
        setRailTab('setup')
        setDocViewOpen(false)
      })
      .catch(() => undefined)
  }

  function restartBrowser(): void {
    void application?.restartBrowser().catch(() => undefined)
  }

  function runSetup(): void {
    if (!application || setupBusy || setupComplete || running) {
      return
    }
    setSetupBusy(true)
    setSetupError(undefined)
    void application
      .loginToNcrmsStd()
      .then((result) => {
        if (isRecord(result) && result.status === 'completed') {
          setSetupComplete(true)
          setRailTab('chat')
          setEntries((current) => [
            ...current,
            { id: nextEntryId('receipt'), kind: 'receipt', text: 'Setup Ran' }
          ])
          return liveTestProgress?.getDocument().then((document) => {
            applyDocument(document)
            setSetupStepCount(document.steps.length)
          })
        }
        setSetupError(
          isRecord(result) && typeof result.message === 'string'
            ? result.message
            : 'Setup could not run.'
        )
      })
      .catch((error: unknown) =>
        setSetupError(error instanceof Error ? error.message : String(error))
      )
      .finally(() => setSetupBusy(false))
  }

  function openUrl(url: string): Promise<string | undefined> {
    if (!application) {
      return Promise.resolve('The secure Electron bridge is unavailable.')
    }
    const stepsBefore = documentRef.current.steps.length
    return application
      .openUrl(url)
      .then((result) => {
        if (isRecord(result) && result.status === 'success') {
          // Deterministic opening lines count as setup while nothing else ran.
          setSetupStepCount((current) =>
            current === stepsBefore ? stepsBefore + 1 : current
          )
          return undefined
        }
        return isRecord(result) && typeof result.message === 'string'
          ? result.message
          : 'The URL could not be opened.'
      })
      .catch((error: unknown) =>
        error instanceof Error ? error.message : String(error)
      )
  }

  function updateStep(index: number, field: string, value: string): void {
    const steps = documentRef.current.steps.map((step, currentIndex) =>
      currentIndex === index
        ? { ...step, [field]: field === 'stepNo' ? Number(value) : value }
        : step
    )
    const updated = { steps }
    applyDocument(updated)
    void liveTestProgress?.updateDocument(updated).catch(() => undefined)
  }

  function addStep(): void {
    const steps = [
      ...documentRef.current.steps,
      {
        stepNo: documentRef.current.steps.length + 1,
        description: '',
        action: 'click' as const,
        selector: '',
        parameter: '',
        additionalParameter: '',
        comments: ''
      }
    ]
    const updated = { steps }
    applyDocument(updated)
    void liveTestProgress?.updateDocument(updated).catch(() => undefined)
  }

  const hasSteps = progressDocument.steps.length > 0
  const legacyConsolesAvailable =
    directToolsAvailable || agentTestingConsoleAvailable

  return (
    <ThemeProvider theme={applicationTheme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden'
        }}
      >
        <Box
          component="header"
          sx={{
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 1.25,
            px: 1.75,
            py: 1.125
          }}
        >
          <Typography
            component="h1"
            sx={{
              color: 'primary.main',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap'
            }}
          >
            AI Assisted Test Automation Accelerator
          </Typography>
          <Typography sx={{ color: 'rgba(28, 35, 48, 0.2)' }}>·</Typography>
          <Stack alignItems="baseline" direction="row" spacing={0.5}>
            <InputBase
              inputProps={{ 'aria-label': 'Session title' }}
              onBlur={() =>
                setSessionTitle(
                  (current) => current.trim() || defaultSessionTitle
                )
              }
              onChange={(event) => setSessionTitle(event.target.value)}
              value={sessionTitle}
              sx={{
                '& input': {
                  color: 'text.primary',
                  fieldSizing: 'content',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  minWidth: '3ch',
                  p: 0
                }
              }}
            />
            <Box component="span" sx={{ fontSize: '12px', opacity: 0.35 }}>
              ✎
            </Box>
          </Stack>
          <StatusTag tone={lifecycle.tone}>{lifecycle.label}</StatusTag>
          {docViewOpen ? (
            <StatusTag tone="neutral">document view</StatusTag>
          ) : null}
          <Box sx={{ flex: 1 }} />
          {awaitingUser ? (
            <Typography color="text.secondary" sx={{ fontSize: '11px' }}>
              no calls while waiting
            </Typography>
          ) : null}
          {running ? (
            <Button
              disabled={stopping}
              onClick={stopRun}
              size="small"
              startIcon={<Stop fontSize="small" />}
              variant="outlined"
            >
              {stopping ? 'Stopping…' : 'Stop'}
            </Button>
          ) : null}
          <Button
            disabled={running || awaitingUser}
            onClick={restartSession}
            size="small"
            startIcon={<RestartAlt fontSize="small" />}
            variant="outlined"
          >
            Restart
          </Button>
          <Button
            disabled={!hasSteps || running}
            endIcon={<ArrowDropDown fontSize="small" />}
            onClick={(event) => setExportAnchor(event.currentTarget)}
            size="small"
            variant="contained"
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchor}
            onClose={() => setExportAnchor(undefined)}
            open={Boolean(exportAnchor)}
          >
            <MenuItem
              onClick={() => {
                downloadFile(
                  exportPlaywright(progressDocument, sessionTitle),
                  'live-test-progress.spec.ts',
                  'text/typescript;charset=utf-8'
                )
                setExportAnchor(undefined)
              }}
              sx={{ fontSize: '12.5px', gap: 1 }}
            >
              <Download fontSize="small" /> Download spec.ts
            </MenuItem>
            <MenuItem
              onClick={() => {
                downloadFile(
                  exportCsv(progressDocument),
                  'live-test-progress.csv',
                  'text/csv;charset=utf-8'
                )
                setExportAnchor(undefined)
              }}
              sx={{ fontSize: '12.5px', gap: 1 }}
            >
              <Download fontSize="small" /> Download CSV
            </MenuItem>
          </Menu>
          {legacyConsolesAvailable ? (
            <>
              <IconButton
                aria-label="Legacy consoles"
                onClick={(event) => setLegacyAnchor(event.currentTarget)}
                size="small"
                sx={{ opacity: 0.45 }}
              >
                <InfoOutlined fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={legacyAnchor}
                onClose={() => setLegacyAnchor(undefined)}
                open={Boolean(legacyAnchor)}
              >
                {directToolsAvailable ? (
                  <MenuItem
                    onClick={() => {
                      void application?.openDirectTools()
                      setLegacyAnchor(undefined)
                    }}
                    sx={{ fontSize: '12.5px' }}
                  >
                    Direct Step Console
                  </MenuItem>
                ) : null}
                {agentTestingConsoleAvailable ? (
                  <MenuItem
                    onClick={() => {
                      void application?.openAgentTestingConsole()
                      setLegacyAnchor(undefined)
                    }}
                    sx={{ fontSize: '12.5px' }}
                  >
                    Agent Testing Console
                  </MenuItem>
                ) : null}
              </Menu>
            </>
          ) : null}
        </Box>

        <Box
          component="main"
          sx={{
            display: 'grid',
            flex: 1,
            gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 24vw)',
            minHeight: 0
          }}
        >
          <Box
            sx={{
              borderColor: 'divider',
              borderRight: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
              position: 'relative'
            }}
          >
            <Box
              aria-label="Embedded browser workspace"
              component="section"
              sx={{
                background: 'linear-gradient(135deg, #e8eaee 0%, #dfe2e8 100%)',
                flex: 1,
                minHeight: 0,
                position: 'relative'
              }}
            >
              <Box ref={workspaceRef} sx={{ inset: 0, position: 'absolute' }} />
              {browserStatus.state === 'starting' ? (
                <BrowserPaneNotice>
                  <Box
                    sx={{
                      bgcolor: '#e0a53a',
                      borderRadius: '50%',
                      height: 8,
                      width: 8
                    }}
                  />
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 600 }}>
                    Starting browser…
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: '10.5px' }}
                  >
                    connecting to the Playwright bridge
                  </Typography>
                </BrowserPaneNotice>
              ) : browserStatus.state === 'failed' ||
                browserStatus.state === 'closed' ? (
                <BrowserPaneNotice>
                  <StatusTag tone="danger">
                    {browserStatus.state === 'failed'
                      ? '✕ browser failed'
                      : '✕ browser closed'}
                  </StatusTag>
                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: '10.5px',
                      maxWidth: 300,
                      textAlign: 'center'
                    }}
                  >
                    {browserStatus.detail ??
                      "the Playwright bridge didn't come up"}
                  </Typography>
                  <Button
                    onClick={restartBrowser}
                    size="small"
                    startIcon={<RestartAlt fontSize="small" />}
                    sx={{ mt: 0.5 }}
                    variant="outlined"
                  >
                    Restart browser
                  </Button>
                </BrowserPaneNotice>
              ) : null}
            </Box>
            <TestDocumentStrip
              awaitingUser={awaitingUser}
              lastTaskStepCount={lastTaskStepCount}
              onExpand={() => setDocViewOpen(true)}
              pendingRow={pendingRow}
              progressDocument={progressDocument}
              running={running}
              setupStepCount={setupStepCount}
            />
            {docViewOpen ? (
              <Box sx={{ inset: 0, position: 'absolute', zIndex: 5 }}>
                <TestDocumentView
                  onAddStep={addStep}
                  onClose={() => setDocViewOpen(false)}
                  onUpdateStep={updateStep}
                  progressDocument={progressDocument}
                  sessionTitle={sessionTitle}
                  setupStepCount={setupStepCount}
                />
              </Box>
            ) : null}
          </Box>

          <ChatRail
            activeTab={railTab}
            browserReady={browserStatus.state === 'ready'}
            composer={composer}
            entries={entries}
            onOpenUrl={openUrl}
            onRespond={respond}
            onRunSetup={runSetup}
            onSubmitTask={submitTask}
            onTabChange={setRailTab}
            running={running}
            setupBusy={setupBusy}
            setupComplete={setupComplete}
            setupError={setupError}
            traceRows={traceRows}
          />
        </Box>
      </Box>
    </ThemeProvider>
  )
}

function BrowserPaneNotice({
  children
}: {
  children: readonly ReactElement[] | ReactElement
}): ReactElement {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1}
      sx={{ inset: 0, position: 'absolute' }}
    >
      {children}
    </Stack>
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
