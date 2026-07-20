import { describe, expect, it } from 'vitest'
import type { KeepRitualPhase } from '../receiptEndingTypes'
import {
  getKeepPhaseAdvance,
  KEEP_RITUAL_TIMING,
} from './keepRitualMotion'

const phases: KeepRitualPhase[] = [
  'cut',
  'align',
  'sleeve-rising',
  'sleeve-receiving',
  'label-registering',
  'archive-opening',
  'archiving',
  'archive-closing',
]

describe('Keep ritual motion contract', () => {
  it('maps every automatic phase to one explicit reducer event', () => {
    const advances = phases.map((phase) => getKeepPhaseAdvance(
      phase,
      false,
      () => '2026-07-20T12:05:00.000Z',
    ))

    expect(advances.map((advance) => advance?.event.type)).toEqual([
      'KEEP_CUT_COMPLETED',
      'KEEP_ALIGNMENT_COMPLETED',
      'KEEP_SLEEVE_RAISED',
      'KEEP_RECEIPT_SLEEVED',
      'KEEP_LABEL_REGISTERED',
      'KEEP_ARCHIVE_OPENED',
      'KEEP_RECEIPT_INSERTED',
      'KEEP_ARCHIVE_CLOSED',
    ])
    expect(advances.at(-1)?.event).toEqual({
      type: 'KEEP_ARCHIVE_CLOSED',
      archivedAt: '2026-07-20T12:05:00.000Z',
    })
  })

  it('uses the documented standard phase durations', () => {
    const delays = phases.map((phase) => getKeepPhaseAdvance(phase, false)?.delay)

    expect(delays).toEqual([
      KEEP_RITUAL_TIMING.cut,
      KEEP_RITUAL_TIMING.align,
      KEEP_RITUAL_TIMING.sleeveRising,
      KEEP_RITUAL_TIMING.sleeveReceiving,
      KEEP_RITUAL_TIMING.labelRegistering,
      KEEP_RITUAL_TIMING.archiveOpening,
      KEEP_RITUAL_TIMING.archiving,
      KEEP_RITUAL_TIMING.archiveClosing,
    ])
  })

  it('preserves every semantic phase with shorter reduced-motion durations', () => {
    const standard = phases.map((phase) => getKeepPhaseAdvance(phase, false))
    const reduced = phases.map((phase) => getKeepPhaseAdvance(phase, true))

    expect(reduced.map((advance) => advance?.event.type)).toEqual(
      standard.map((advance) => advance?.event.type),
    )
    reduced.forEach((advance, index) => {
      expect(advance?.delay).toBeLessThanOrEqual(standard[index]!.delay)
      expect(advance?.delay).toBeGreaterThan(0)
    })
  })

  it('does not schedule progression after truthful completion', () => {
    expect(getKeepPhaseAdvance('complete', false)).toBeNull()
    expect(getKeepPhaseAdvance('complete', true)).toBeNull()
  })
})
