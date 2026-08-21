import { Box, CssBaseline, ThemeProvider, Typography } from '@mui/material'
import { useEffect, useState, type ReactElement } from 'react'

import { applicationTheme } from './app-theme'
import { AgentTestingConsole } from './agent-testing-console'

export function AgentTestingConsoleApp(): ReactElement {
  const agentTestingConsole = window.testGen?.agentTestingConsole
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    if (!agentTestingConsole) {
      return
    }

    void agentTestingConsole
      .getConfiguration()
      .then((configuration) => setIsEnabled(configuration.enabled))
      .catch(() => setIsEnabled(false))
  }, [agentTestingConsole])

  return (
    <ThemeProvider theme={applicationTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', p: 2 }}>
        {isEnabled && agentTestingConsole ? (
          <AgentTestingConsole agentTestingConsole={agentTestingConsole} />
        ) : (
          <Typography color="text.secondary" variant="body2">
            The Agent Testing Console is unavailable for this launch.
          </Typography>
        )}
      </Box>
    </ThemeProvider>
  )
}
