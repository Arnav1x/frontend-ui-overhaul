import { Box } from '@mui/material'
import type { ReactElement, ReactNode } from 'react'

import { monoFontFamily } from './app-theme'
import type { StatusTone } from './session-lifecycle'

const toneStyles: Record<StatusTone, { bgcolor: string; color: string }> = {
  neutral: {
    bgcolor: 'rgba(28, 35, 48, 0.06)',
    color: 'rgba(28, 35, 48, 0.65)'
  },
  success: { bgcolor: '#e3f4ec', color: '#177449' },
  active: { bgcolor: '#fdf1e0', color: '#a55e0a' },
  danger: { bgcolor: '#fceceb', color: '#b3362e' },
  accent: { bgcolor: '#e9ebfb', color: '#3f4cc0' }
}

/** Pill tag used for lifecycle chips, tool tags, and receipts. */
export function StatusTag({
  children,
  tone
}: {
  children: ReactNode
  tone: StatusTone
}): ReactElement {
  return (
    <Box
      component="span"
      sx={{
        ...toneStyles[tone],
        alignItems: 'center',
        borderRadius: 999,
        display: 'inline-flex',
        flex: 'none',
        fontFamily: monoFontFamily,
        fontSize: '10px',
        fontWeight: 500,
        gap: 0.5,
        lineHeight: 1.6,
        px: 1,
        py: '1px',
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </Box>
  )
}
