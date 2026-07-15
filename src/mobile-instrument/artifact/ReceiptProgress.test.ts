import { describe, expect, it } from 'vitest'
import { calculateReceiptProgress } from './ReceiptProgress'

describe('Evidence Viewer receipt progress', () => {
  it('stays hidden when the artifact does not meaningfully overflow', () => {
    expect(calculateReceiptProgress(0, 640, 600)).toEqual({
      visible: false,
      percent: 100,
    })
  })

  it('reports progress from the internal receipt viewport', () => {
    expect(calculateReceiptProgress(300, 1200, 600)).toEqual({
      visible: true,
      percent: 50,
    })
  })

  it('clamps overscroll at both ends', () => {
    expect(calculateReceiptProgress(-30, 1200, 600).percent).toBe(0)
    expect(calculateReceiptProgress(900, 1200, 600).percent).toBe(100)
  })
})
