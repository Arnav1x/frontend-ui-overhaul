import { createTheme } from '@mui/material'

export const monoFontFamily =
  "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

export const inkColor = '#1c2330'

export const applicationTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3f4cc0',
      dark: '#2f3a9e'
    },
    secondary: {
      main: '#0f766e'
    },
    success: {
      main: '#1f9d61',
      dark: '#177449'
    },
    warning: {
      main: '#a55e0a'
    },
    error: {
      main: '#b3362e'
    },
    background: {
      default: '#eceef1',
      paper: '#ffffff'
    },
    text: {
      primary: inkColor,
      secondary: 'rgba(28, 35, 48, 0.58)'
    },
    divider: 'rgba(28, 35, 48, 0.1)'
  },
  shape: {
    borderRadius: 10
  },
  typography: {
    fontFamily: "'Public Sans', 'Segoe UI', system-ui, sans-serif",
    h4: {
      fontWeight: 700
    },
    h6: {
      fontWeight: 700
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  }
})

/** Uppercase micro-label used for panel section headers, per the overhaul kit. */
export const microLabelSx = {
  color: 'rgba(28, 35, 48, 0.45)',
  fontFamily: monoFontFamily,
  fontSize: '9.5px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  lineHeight: 1,
  textTransform: 'uppercase'
} as const

/** Dark code-surface palette shared by the spec panel and trace payloads. */
export const codeSurface = {
  background: '#10131f',
  base: '#8b93a7',
  keyword: '#7aa2f7',
  accent: '#e0af68',
  string: '#9ece6a',
  plain: '#c8ccd8',
  success: '#5fbd8f',
  dim: '#565f78'
} as const
