import { describe, expect, it } from 'vitest'
import {
  RECEIPT_ENDING_DURATION,
  RECEIPT_ENDING_EASING,
  RECEIPT_ENDING_TIMING,
  resolveRitualDuration,
} from './receiptEndingMotion'

describe('Three Endings motion tokens', () => {
  it('defines one semantic duration and easing source', () => {
    expect(RECEIPT_ENDING_DURATION).toEqual({
      instant: 0,
      fast: 120,
      standard: 220,
      ritual: 420,
      hold: 100,
    })
    expect(new Set(Object.values(RECEIPT_ENDING_EASING)).size).toBe(
      Object.values(RECEIPT_ENDING_EASING).length,
    )
  })

  it('retains the established issue-owned choreography values', () => {
    expect(RECEIPT_ENDING_TIMING.keep.archiveClosing).toBe(220)
    expect(RECEIPT_ENDING_TIMING.release.cornerHold).toBe(100)
    expect(RECEIPT_ENDING_TIMING.carry.extensionPrintMs).toBe(780)
    expect(RECEIPT_ENDING_TIMING.carry.reducedTransitionMs).toBe(80)
  })

  it('preserves semantic delay under reduced motion and deterministic test holds', () => {
    expect(resolveRitualDuration({ standard: 520, reducedMotion: true, reducedCap: 120 })).toBe(120)
    expect(resolveRitualDuration({ standard: 80, reducedMotion: true, reducedCap: 100 })).toBe(80)
    expect(resolveRitualDuration({ standard: 520, reducedMotion: false })).toBe(520)
    expect(resolveRitualDuration({ standard: 520, reducedMotion: false, testHold: 333 })).toBe(333)
  })
})
