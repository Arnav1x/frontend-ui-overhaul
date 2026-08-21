import { createTheme } from '@mui/material'

export const applicationTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#075985'
    },
    secondary: {
      main: '#0f766e'
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff'
    }
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: 'Inter, Segoe UI, sans-serif',
    h4: {
      fontWeight: 700
    },
    h6: {
      fontWeight: 700
    }
  }
})
