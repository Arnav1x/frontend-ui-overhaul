import { describe, expect, it } from 'vitest'

import {
  appendCapturedStep,
  createLiveTestProgressDocument
} from './live-test-progress'

describe('Live Test Progress', () => {
  it('appends captured facts as editable export fields', () => {
    const document = appendCapturedStep(createLiveTestProgressDocument(), {
      stepNumber: 1,
      description: '',
      action: 'fill',
      selector: { kind: 'css', value: '#username', strategy: 'id' },
      playwrightLocator: 'page.locator("#username")',
      parameter: 'test-user'
    })

    expect(document).toEqual({
      steps: [
        {
          stepNo: 1,
          description: '',
          action: 'fillintext',
          selector: '#username',
          parameter: 'test-user',
          additionalParameter: '',
          comments: ''
        }
      ]
    })
  })
})
