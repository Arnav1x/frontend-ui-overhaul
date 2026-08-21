import { Box, CssBaseline, ThemeProvider, Typography } from '@mui/material'
import { useEffect, useState, type ReactElement } from 'react'

import type { BrowserSessionStatus } from '../browser/browser-session'
import { applicationTheme } from './app-theme'
import { DirectStepConsole } from './direct-step-console'

export function DirectToolsApp(): ReactElement {
  const browser = window.testGen?.browser
  const directTools = window.testGen?.directTools
  const [isEnabled, setIsEnabled] = useState(false)
  const [browserStatus, setBrowserStatus] = useState<BrowserSessionStatus>(
    browser
      ? { state: 'starting' }
      : {
          state: 'failed',
          detail: 'Secure Electron bridge is unavailable.'
        }
  )

  useEffect(() => {
    if (!directTools) {
      return
    }

    void directTools
      .getConfiguration()
      .then((configuration) => setIsEnabled(configuration.enabled))
      .catch(() => setIsEnabled(false))
  }, [directTools])

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

  return (
    <ThemeProvider theme={applicationTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', p: 2 }}>
        {isEnabled && directTools ? (
          <DirectStepConsole
            browserStatus={browserStatus}
            directTools={directTools}
          />
        ) : (
          <Typography color="text.secondary" variant="body2">
            The Direct Step Console is unavailable for this launch.
          </Typography>
        )}
      </Box>
    </ThemeProvider>
  )
}
