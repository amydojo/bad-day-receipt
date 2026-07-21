import { describe, expect, it } from 'vitest'
import type { ReleaseRitualPhase } from '../receiptEndingTypes'
import { getReleasePhaseAdvance, RELEASE_RITUAL_TIMING } from './releaseRitualMotion'

const phases: ReleaseRitualPhase[] = [
  'cut',
  'unprint-total',
  'unprint-lines',
  'unprint-receipt-number',
  'unprint-acknowledgment',
  'soften',
  'slot-opening',
  'receiving',
  'corner-hold',
  'slot-closing',
]

describe('Release ritual motion', () => {
  it('keeps the final corner hold explicit and within the 80–120ms contract', () => {
    expect(RELEASE_RITUAL_TIMING.cornerHold).toBeGreaterThanOrEqual(80)
    expect(RELEASE_RITUAL_TIMING.cornerHold).toBeLessThanOrEqual(120)
    expect(getReleasePhaseAdvance('corner-hold', false)?.event).toEqual({
      type: 'RELEASE_CORNER_HOLD_COMPLETED',
    })
  })

  it('maps every automatic phase to exactly one semantic event', () => {
    const events = phases.map((phase) => getReleasePhaseAdvance(
      phase,
      false,
      () => new Date('2026-07-20T12:05:00.000Z'),
    )?.event.type)
    expect(events).toEqual([
      'RELEASE_CUT_COMPLETED',
      'RELEASE_TOTAL_UNPRINTED',
      'RELEASE_LINES_UNPRINTED',
      'RELEASE_NUMBER_UNPRINTED',
      'RELEASE_ACKNOWLEDGMENT_UNPRINTED',
      'RELEASE_PAPER_SOFTENED',
      'RELEASE_SLOT_OPENED',
      'RELEASE_RECEIPT_RECEIVED',
      'RELEASE_CORNER_HOLD_COMPLETED',
      'RELEASE_SLOT_CLOSED',
    ])
  })

  it('preserves the same semantic events under reduced motion', () => {
    for (const phase of phases) {
      const standard = getReleasePhaseAdvance(phase, false, () => new Date('2026-07-20T12:05:00.000Z'))
      const reduced = getReleasePhaseAdvance(phase, true, () => new Date('2026-07-20T12:05:00.000Z'))
      expect(reduced?.event).toEqual(standard?.event)
      expect(reduced?.delay ?? Infinity).toBeLessThanOrEqual(standard?.delay ?? 0)
    }
  })

  it('does not schedule persistence, completion, or Undo phases', () => {
    expect(getReleasePhaseAdvance('committing', false)).toBeNull()
    expect(getReleasePhaseAdvance('complete', false)).toBeNull()
    expect(getReleasePhaseAdvance('undoing', false)).toBeNull()
  })
})
