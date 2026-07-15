import { describe, expect, it } from 'vitest'
import {
  CVS_V4_TOTAL,
  milestoneForPhase,
  REDUCED_MOTION,
  STANDARD_V4_TOTAL,
  V4_MOTION,
} from './productionMotion'

describe('V4 production motion contract', () => {
  it('keeps paper production slower than the scanner', () => {
    expect(V4_MOTION.receiptFeed).toBeGreaterThan(V4_MOTION.scannerSweep)
    expect(V4_MOTION.cvsCouponFeed).toBeGreaterThan(V4_MOTION.cvsPrimaryReceiptFeed)
  })

  it('preserves the CVS false-ending suspense', () => {
    expect(V4_MOTION.cvsFalseEndingSilence).toBe(1080)
    expect(V4_MOTION.cvsFalseEndingSilence).toBeGreaterThan(V4_MOTION.verdictSilence)
  })

  it('keeps standard and CVS journeys distinct', () => {
    expect(STANDARD_V4_TOTAL).toBeGreaterThan(4000)
    expect(CVS_V4_TOTAL).toBeGreaterThan(STANDARD_V4_TOTAL)
  })

  it('maps domain phases to stable test milestones', () => {
    expect(milestoneForPhase('idle')).toBe('compose')
    expect(milestoneForPhase('scanning')).toBe('scanning')
    expect(milestoneForPhase('feeding')).toBe('feeding')
    expect(milestoneForPhase('falseComplete')).toBe('apparent-complete')
    expect(milestoneForPhase('printingCoupons')).toBe('coupon-feeding')
    expect(milestoneForPhase('complete')).toBe('artifact')
  })

  it('uses non-zero reduced-motion durations to preserve causality', () => {
    expect(Object.values(REDUCED_MOTION).every((duration) => duration > 0)).toBe(true)
  })
})
