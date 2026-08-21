import { describe, expect, it } from 'vitest'

import { exportCsv } from './csv-exporter'

describe('CSV exporter', () => {
  it('uses the required headers, spreadsheet terminology, and RFC 4180 escaping', () => {
    expect(
      exportCsv({
        steps: [
          {
            stepNo: 3,
            description: 'Enter "name", then continue',
            action: 'fillintext',
            selector: '#name',
            parameter: 'Ada\nLovelace',
            additionalParameter: '',
            comments: 'Use test account'
          }
        ]
      })
    ).toBe(
      'StepNo,Description,Action,Selector,Parameter,Additional Parameter,Comments\r\n' +
        '3,"Enter ""name"", then continue",fillintext,#name,"Ada\nLovelace",,Use test account\r\n'
    )
  })
})
