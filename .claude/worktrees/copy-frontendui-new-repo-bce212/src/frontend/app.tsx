import {
  ArrowBack,
  ArrowForward,
  AutoAwesome,
  CheckCircleOutline,
  LockOutlined,
  MoreHoriz,
  RestartAlt,
  Send,
  Refresh,
  Terminal,
  RocketLaunch,
  Visibility
} from '@mui/icons-material'
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  CssBaseline,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography
} from '@mui/material'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement
} from 'react'

import type { BrowserExecutionAgentRunResult } from '../authoring/browser-execution-agent-run-result'
import type { BrowserSessionStatus } from '../browser/browser-session'
import { applicationTheme } from './app-theme'
import { browserSessionPresentation } from './browser-session-presentation'

type ChatMessage =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'working' }
  | { id: string; kind: 'result'; result: BrowserExecutionAgentRunResult }

export function App(): ReactElement {
  const application = window.testGen?.application
  const browser = window.testGen?.browser
  const aiAuthoring = window.testGen?.aiAuthoring
  const workspaceRef = useRef<HTMLDivElement>(null)
  const chatMessageId = useRef(0)
  const [electronVersion, setElectronVersion] = useState(
    application ? 'loading' : 'unavailable'
  )
  const [directToolsAvailable, setDirectToolsAvailable] = useState(false)
  const [agentTestingConsoleAvailable, setAgentTestingConsoleAvailable] =
    useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiRunInProgress, setAiRunInProgress] = useState(false)
  const [aiWaitingForUser, setAiWaitingForUser] = useState(false)
  const [loginStatus, setLoginStatus] = useState<string | undefined>()
  const [chatMessages, setChatMessages] = useState<readonly ChatMessage[]>([])
  const [browserStatus, setBrowserStatus] = useState<BrowserSessionStatus>(
    browser
      ? { state: 'starting' }
      : {
          state: 'failed',
          detail: 'Secure Electron bridge is unavailable.'
        }
  )

  useEffect(() => {
    if (!application) {
      return
    }

    void application
      .getVersion()
      .then(setElectronVersion)
      .catch(() => setElectronVersion('unavailable'))
  }, [application])

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

  useLayoutEffect(() => {
    const workspace = workspaceRef.current
    if (!browser || !workspace) {
      return
    }

    const reportBounds = (): void => {
      const bounds = workspace.getBoundingClientRect()
      void browser.setWorkspaceBounds({
        height: bounds.height,
        width: bounds.width,
        x: bounds.x,
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
  }, [browser])

  const bridgeStatus =
    electronVersion === 'unavailable'
      ? 'Secure Electron bridge is unavailable'
      : 'Secure Electron bridge connected'

  function submitAiInstruction(event?: FormEvent<HTMLFormElement>): void {
    event?.preventDefault()
    const instruction = aiInstruction.trim()
    if (!aiAuthoring || aiRunInProgress || !instruction) {
      return
    }

    chatMessageId.current += 1
    const messageId = `run-${chatMessageId.current}`
    setAiRunInProgress(true)
    setAiInstruction('')
    setChatMessages((current) => [
      ...current,
      { id: `user-${messageId}`, kind: 'user', text: instruction },
      { id: messageId, kind: 'working' }
    ])
    void aiAuthoring
      .run(instruction)
      .then((result) => {
        replaceWorkingMessage(messageId, result)
        setAiWaitingForUser(result.status === 'awaiting_user')
      })
      .catch((error: unknown) =>
        replaceWorkingMessage(messageId, {
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
          callsUsed: 0
        })
      )
      .finally(() => setAiRunInProgress(false))
  }

  function replaceWorkingMessage(
    messageId: string,
    result: BrowserExecutionAgentRunResult
  ): void {
    setChatMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { id: messageId, kind: 'result', result }
          : message
      )
    )
  }

  function respondToAiQuestion(messageId: string, response: string): void {
    if (!aiAuthoring || aiRunInProgress || !response.trim()) return
    setAiRunInProgress(true)
    setAiWaitingForUser(false)
    void aiAuthoring
      .respond(response)
      .then((result) => {
        replaceWorkingMessage(messageId, result)
        setAiWaitingForUser(result.status === 'awaiting_user')
      })
      .catch((error: unknown) =>
        replaceWorkingMessage(messageId, {
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
          callsUsed: 0
        })
      )
      .finally(() => setAiRunInProgress(false))
  }

  function restartSession(): void {
    if (!application || aiRunInProgress || aiWaitingForUser) return

    void application
      .restartSession()
      .then(() => {
        setAiInstruction('')
        setAiWaitingForUser(false)
        setChatMessages([])
        setLoginStatus(undefined)
      })
      .catch(() => undefined)
  }

  return (
    <ThemeProvider theme={applicationTheme}>
      <CssBaseline />
      <Box
        sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <AppBar elevation={0} position="static">
          <Toolbar sx={{ gap: 2 }}>
            <RocketLaunch />
            <Box sx={{ flexGrow: 1 }}>
              <Typography component="h1" variant="h6">
                AI Assisted Test Automation Accelerator
              </Typography>
              <Typography sx={{ opacity: 0.8 }} variant="caption">
                AI-powered browser test authoring workspace
              </Typography>
            </Box>
            <Chip
              color="success"
              icon={<CheckCircleOutline />}
              label={browserSessionPresentation(browserStatus)}
              size="small"
              variant="outlined"
            />
            <Button
              color="inherit"
              disabled={aiRunInProgress || aiWaitingForUser}
              onClick={restartSession}
              startIcon={<RestartAlt />}
              variant="outlined"
            >
              Restart Session
            </Button>
            {directToolsAvailable ? (
              <Button
                color="inherit"
                onClick={() => void application?.openDirectTools()}
                startIcon={<Terminal />}
                variant="outlined"
              >
                Open Direct Step Console
              </Button>
            ) : null}
            {agentTestingConsoleAvailable ? (
              <Button
                color="inherit"
                onClick={() => void application?.openAgentTestingConsole()}
                startIcon={<Terminal />}
                variant="outlined"
              >
                Open Agent Testing Console
              </Button>
            ) : null}
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            alignItems: 'stretch',
            display: 'grid',
            flexGrow: 1,
            gap: 3,
            gridTemplateColumns: {
              lg: 'clamp(360px, 24vw, 460px) minmax(0, 1fr)'
            },
            p: 3
          }}
        >
          <AiAuthoringChat
            aiAuthoringAvailable={Boolean(aiAuthoring)}
            browserStatus={browserStatus}
            instruction={aiInstruction}
            isRunning={aiRunInProgress || aiWaitingForUser}
            messages={chatMessages}
            onInstructionChange={setAiInstruction}
            onSubmit={submitAiInstruction}
            onViewTest={() => void application?.openLiveTestProgress()}
            onRespond={respondToAiQuestion}
            onLogin={() =>
              void application
                ?.loginToNcrmsStd()
                .then((result: unknown) =>
                  setLoginStatus(
                    typeof result === 'object' &&
                      result !== null &&
                      'message' in result
                      ? String(result.message)
                      : 'Login could not start.'
                  )
                )
            }
            loginStatus={loginStatus}
          />

          <Paper
            aria-label="Embedded browser workspace"
            component="section"
            elevation={0}
            sx={{
              aspectRatio: '16 / 10',
              border: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              justifySelf: 'center',
              minHeight: 0,
              overflow: 'hidden',
              position: 'relative',
              width: '100%'
            }}
          >
            <BrowserChrome />
            <Box
              sx={{
                bgcolor: 'background.paper',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <Box
                ref={workspaceRef}
                sx={{ height: '100%', overflow: 'hidden' }}
              />
            </Box>
          </Paper>
        </Box>

        <Box component="footer" sx={{ px: 3, py: 1.5 }}>
          <Typography color="text.secondary" variant="caption">
            {bridgeStatus} · Electron {electronVersion}
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

function BrowserChrome(): ReactElement {
  return (
    <Box
      component="header"
      sx={{ bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}
    >
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          gap: 0.5,
          px: { xs: 1.5, sm: 1.5 },
          pb: 1,
          pt: 0.5
        }}
      >
        <IconButton aria-label="Go back" disabled size="small">
          <ArrowBack fontSize="small" />
        </IconButton>
        <IconButton aria-label="Go forward" disabled size="small">
          <ArrowForward fontSize="small" />
        </IconButton>
        <IconButton aria-label="Reload page" disabled size="small">
          <Refresh fontSize="small" />
        </IconButton>
        <TextField
          aria-label="Browser address bar"
          fullWidth
          inputProps={{ readOnly: true }}
          size="small"
          value=""
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlined fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiInputBase-root': {
              bgcolor: 'background.paper',
              borderRadius: 6
            }
          }}
        />
        <IconButton aria-label="Browser options" disabled size="small">
          <MoreHoriz fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}

function AiAuthoringChat({
  aiAuthoringAvailable,
  browserStatus,
  instruction,
  isRunning,
  messages,
  onInstructionChange,
  onSubmit,
  onViewTest,
  onRespond,
  onLogin,
  loginStatus
}: {
  aiAuthoringAvailable: boolean
  browserStatus: BrowserSessionStatus
  instruction: string
  isRunning: boolean
  messages: readonly ChatMessage[]
  onInstructionChange: (instruction: string) => void
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void
  onViewTest: () => void
  onRespond: (messageId: string, response: string) => void
  onLogin: () => void
  loginStatus?: string
}): ReactElement {
  const browserReady = browserStatus.state === 'ready'

  return (
    <Paper
      component="section"
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 2.5 }}>
        <Stack alignItems="flex-start" direction="row" spacing={1.5}>
          <AutoAwesome color="secondary" />
          <Box sx={{ flexGrow: 1 }}>
            <Typography component="h2" variant="h6">
              AI Authoring
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Send one browser task at a time.
            </Typography>
          </Box>
          <Chip
            color={browserReady ? 'success' : 'default'}
            label={browserSessionPresentation(browserStatus)}
            size="small"
            variant="outlined"
          />
        </Stack>
      </Box>

      <Box
        aria-live="polite"
        component="section"
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2.5 }}
      >
        <Stack spacing={2}>
          {messages.map((message) => {
            switch (message.kind) {
              case 'user':
                return (
                  <Box
                    key={message.id}
                    sx={{ alignSelf: 'flex-end', maxWidth: '92%' }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        p: 1.5
                      }}
                    >
                      <Typography variant="body2">{message.text}</Typography>
                    </Paper>
                  </Box>
                )
              case 'working':
                return (
                  <AssistantMessage key={message.id}>
                    <Stack alignItems="center" direction="row" spacing={1}>
                      <CircularProgress size={16} />
                      <Typography variant="body2">
                        Working in the embedded browser…
                      </Typography>
                    </Stack>
                  </AssistantMessage>
                )
              case 'result':
                return (
                  <RunResultMessage
                    key={message.id}
                    onRespond={(response) => onRespond(message.id, response)}
                    result={message.result}
                  />
                )
            }
          })}
        </Stack>
      </Box>

      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}
      >
        <Stack spacing={1.25}>
          <TextField
            disabled={!aiAuthoringAvailable || isRunning}
            label="Describe the browser task"
            maxRows={6}
            minRows={3}
            multiline
            onChange={(event) => onInstructionChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSubmit()
              }
            }}
            placeholder="For example: Sign in with the supplied test credentials."
            value={instruction}
          />
          <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography color="text.secondary" variant="caption">
              Enter to send · Shift+Enter for a new line
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                onClick={onViewTest}
                size="small"
                startIcon={<Visibility />}
                variant="outlined"
              >
                View test
              </Button>
              <Button
                disabled={
                  !aiAuthoringAvailable || isRunning || !instruction.trim()
                }
                endIcon={
                  isRunning ? (
                    <CircularProgress color="inherit" size={16} />
                  ) : (
                    <Send />
                  )
                }
                type="submit"
                variant="contained"
              >
                {isRunning ? 'Working' : 'Send'}
              </Button>
            </Stack>
          </Stack>
          {!aiAuthoringAvailable ? (
            <Typography color="error" variant="caption">
              AI Authoring is unavailable because the secure Electron bridge is
              unavailable.
            </Typography>
          ) : null}
          <Button onClick={onLogin} size="small" variant="text">
            Log in
          </Button>
          {loginStatus ? (
            <Typography color="text.secondary" variant="caption">
              {loginStatus}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Paper>
  )
}

function AssistantMessage({
  children
}: {
  children: ReactElement | ReactElement[]
}): ReactElement {
  return (
    <Box sx={{ alignSelf: 'flex-start', maxWidth: '94%' }}>
      <Paper elevation={0} sx={{ bgcolor: 'grey.100', p: 1.5 }}>
        {children}
      </Paper>
    </Box>
  )
}

function RunResultMessage({
  onRespond,
  result
}: {
  onRespond: (response: string) => void
  result: BrowserExecutionAgentRunResult
}): ReactElement {
  const isCompleted = result.status === 'completed'
  const isAwaitingUser = result.status === 'awaiting_user'
  const title =
    result.status === 'completed'
      ? 'Task completed'
      : result.status === 'awaiting_user'
        ? 'Clarification needed'
        : result.status === 'stopped'
          ? 'Task stopped'
          : 'Task could not finish'
  const detail =
    result.status === 'completed'
      ? result.output
      : result.status === 'awaiting_user'
        ? result.question
        : result.status === 'stopped'
          ? (result.message ?? stoppedReason(result.reason))
          : result.message

  return (
    <AssistantMessage>
      <Stack spacing={1.25}>
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={1}
        >
          <Typography
            color={
              isCompleted
                ? 'success.main'
                : isAwaitingUser
                  ? 'warning.main'
                  : 'error.main'
            }
            variant="subtitle2"
          >
            {title}
          </Typography>
          <Chip
            label={`${result.callsUsed} calls`}
            size="small"
            variant="outlined"
          />
        </Stack>
        <Typography variant="body2">{detail}</Typography>
        {isAwaitingUser ? <ClarificationForm onRespond={onRespond} /> : null}
        {isCompleted ? (
          <>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {result.actions.map((action, index) => (
                <Chip
                  key={`${action}-${index}`}
                  label={`${index + 1}. ${action}`}
                  size="small"
                />
              ))}
            </Stack>
            <Box component="details">
              <Typography
                component="summary"
                sx={{ cursor: 'pointer' }}
                variant="body2"
              >
                Captured steps ({result.testDocument.steps.length})
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {result.testDocument.steps.map((step) => (
                  <Box
                    key={step.stepNumber}
                    sx={{ borderLeft: 2, borderColor: 'divider', pl: 1 }}
                  >
                    <Typography variant="caption">
                      {step.stepNumber}. {step.action}
                      {step.selector.value ? ` · ${step.selector.value}` : ''}
                    </Typography>
                    {step.parameter !== undefined ? (
                      <Typography
                        color="text.secondary"
                        display="block"
                        variant="caption"
                      >
                        Entered value: ••••••••
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            </Box>
          </>
        ) : null}
      </Stack>
    </AssistantMessage>
  )
}

function ClarificationForm({
  onRespond
}: {
  onRespond: (response: string) => void
}): ReactElement {
  const [response, setResponse] = useState('')
  return (
    <Stack direction="row" spacing={1}>
      <TextField
        fullWidth
        label="Your response"
        onChange={(event) => setResponse(event.target.value)}
        size="small"
        value={response}
      />
      <Button
        disabled={!response.trim()}
        onClick={() => onRespond(response)}
        variant="contained"
      >
        Continue
      </Button>
    </Stack>
  )
}

function stoppedReason(
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
  }
}
