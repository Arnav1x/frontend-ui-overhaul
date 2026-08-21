import type { BrowserSessionStatus } from '../browser/browser-session'

export function browserSessionPresentation(
  status: BrowserSessionStatus
): string {
  switch (status.state) {
    case 'starting':
      return 'Starting the embedded browser'
    case 'ready':
      return 'Embedded browser ready'
    case 'navigating':
      return 'Embedded browser navigating'
    case 'failed':
      return status.detail
        ? `Embedded browser unavailable: ${status.detail}`
        : 'Embedded browser unavailable'
    case 'closed':
      return 'Embedded browser closed'
  }
}
