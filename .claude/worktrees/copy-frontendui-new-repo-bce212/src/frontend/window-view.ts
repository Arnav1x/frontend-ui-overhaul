export type TestGenWindowView =
  | 'main'
  | 'direct-tools'
  | 'agent-testing-console'
  | 'live-test-progress'

export function getTestGenWindowView(search: string): TestGenWindowView {
  switch (new URLSearchParams(search).get('view')) {
    case 'direct-tools':
      return 'direct-tools'
    case 'agent-testing-console':
      return 'agent-testing-console'
    case 'live-test-progress':
      return 'live-test-progress'
    default:
      return 'main'
  }
}
