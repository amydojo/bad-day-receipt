import { describe, expect, it } from 'vitest'
import {
  getPrinterAnnouncement,
  getRingButtonLabel,
  getScanRevealCounts,
  initialPrinterState,
  mechanicalEase,
  printerReducer,
} from './printerMachine'

describe('printer reducer', () => {
  it('moves through the core states and reveals content', () => {
    const started = printerReducer(initialPrinterState, {
      type: 'START',
      receiptNumber: 'BD-01-1000',
    })
    expect(started.phase).toBe('arming')
    expect(started.paperProgress).toBe(0)

    const line = printerReducer(started, { type: 'REVEAL_LINE', lineIndex: 2 })
    expect(line.visibleLineCount).toBe(3)

    const total = printerReducer(line, { type: 'REVEAL_TOTAL', rowIndex: 3 })
    expect(total.visibleTotalRows).toBe(4)

    const stamped = printerReducer(total, { type: 'STAMP' })
    expect(stamped.phase).toBe('stamping')

    const complete = printerReducer(stamped, { type: 'COMPLETE' })
    expect(complete.phase).toBe('complete')
  })

  it('resets and preserves transaction data on failure', () => {
    const started = printerReducer(initialPrinterState, {
      type: 'START',
      receiptNumber: 'BD-01-1000',
    })
    const failed = printerReducer(started, {
      type: 'FAIL',
      message: 'still valid',
    })

    expect(failed.phase).toBe('error')
    expect(failed.receiptNumber).toBe('BD-01-1000')
    expect(printerReducer(failed, { type: 'RESET' })).toEqual(initialPrinterState)
  })
})

describe('printer copy and timing helpers', () => {
  it('uses CVS-specific coupon language', () => {
    expect(getRingButtonLabel('printingCoupons', 'cvs')).toBe(
      'PRINTING REWARDS YOU DID NOT REQUEST',
    )
    expect(getRingButtonLabel('complete', 'original')).toBe('RING IT UP AGAIN')
    expect(getRingButtonLabel('error', 'original')).toBe('TRY REGISTER AGAIN')
    expect(getPrinterAnnouncement('printingCoupons')).toContain('CVS')
  })

  it('groups long receipts without losing the final line', () => {
    expect(getScanRevealCounts(12)).toEqual([1, 2, 3, 4, 5, 11, 12])
  })

  it('keeps mechanical easing in bounds', () => {
    expect(mechanicalEase(0)).toBe(0)
    expect(mechanicalEase(1)).toBe(1)
    expect(mechanicalEase(0.5)).toBeGreaterThan(0)
    expect(mechanicalEase(0.5)).toBeLessThanOrEqual(1)
  })
})
