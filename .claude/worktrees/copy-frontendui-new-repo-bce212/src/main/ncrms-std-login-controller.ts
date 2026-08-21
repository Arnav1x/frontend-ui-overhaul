import type {
  BrowserSession,
  NcrmsStdLoginStep
} from '../browser/browser-session'

export class NcrmsStdLoginController {
  constructor(
    private readonly getBrowserSession: () => BrowserSession | undefined
  ) {}

  async run(): Promise<
    | {
        status: 'completed'
        steps: readonly NcrmsStdLoginStep[]
        message: string
      }
    | { status: 'failed'; message: string }
  > {
    const username = process.env.NCRMS_STD_USERNAME?.trim()
    const password = process.env.NCRMS_STD_PASSWORD?.trim()
    if (!username || !password)
      return {
        status: 'failed',
        message:
          'NCRMS_STD_USERNAME and NCRMS_STD_PASSWORD must be set in .env.'
      }
    const session = this.getBrowserSession()
    if (!session)
      return {
        status: 'failed',
        message: 'The embedded browser is unavailable.'
      }
    const result = await session.runNcrmsStdLogin({ username, password })
    return result.status === 'success'
      ? {
          ...result,
          status: 'completed',
          message: 'NCRMS STD login submitted.'
        }
      : result
  }
}
