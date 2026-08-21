import { describe, expect, it } from 'vitest'

import { LiveTestProgressController } from './live-test-progress-controller'

describe('LiveTestProgressController', () => {
  it('returns copies and accepts a lightweight edited document', () => {
    const controller = new LiveTestProgressController()
    const updated = controller.replaceDocument({
      steps: [
        {
          stepNo: 9,
          description: 'Open login',
          action: 'navigate',
          selector: '',
          parameter: 'https://example.test/login',
          additionalParameter: '',
          comments: 'Edited by tester'
        }
      ]
    })
    updated.steps[0].comments = 'Local change only'

    expect(controller.getDocument().steps[0].comments).toBe('Edited by tester')
  })

  it('clears the current in-session document', () => {
    const controller = new LiveTestProgressController()
    controller.replaceDocument({
      steps: [
        {
          stepNo: 1,
          description: '',
          action: 'click',
          selector: '#continue',
          parameter: '',
          additionalParameter: '',
          comments: ''
        }
      ]
    })

    expect(controller.clearDocument()).toEqual({ steps: [] })
  })
})
