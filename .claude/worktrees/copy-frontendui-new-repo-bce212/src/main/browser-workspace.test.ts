import { describe, expect, it } from 'vitest'

import { normalizeWorkspaceBounds } from './browser-workspace'

describe('normalizeWorkspaceBounds', () => {
  it('uses content-view coordinates rounded to device-independent pixels', () => {
    expect(
      normalizeWorkspaceBounds({
        x: 10.4,
        y: 20.6,
        width: 399.5,
        height: 300.2
      })
    ).toEqual({ x: 10, y: 21, width: 400, height: 300 })
  })

  it('rejects negative and non-finite dimensions', () => {
    expect(
      normalizeWorkspaceBounds({ x: 0, y: 0, width: -1, height: 100 })
    ).toBeUndefined()
    expect(
      normalizeWorkspaceBounds({ x: Number.NaN, y: 0, width: 1, height: 1 })
    ).toBeUndefined()
  })
})
