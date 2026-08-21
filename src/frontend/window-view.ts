export type TestGenWindowView =
  | 'main'
  | 'direct-tools'
  | 'agent-testing-console'

export function getTestGenWindowView(search: string): TestGenWindowView {
  switch (new URLSearchParams(search).get('view')) {
    case 'direct-tools':
      return 'direct-tools'
    case 'agent-testing-console':
      return 'agent-testing-console'
    default:
      return 'main'
  }
}
