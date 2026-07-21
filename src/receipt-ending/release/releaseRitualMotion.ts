import type {
  ReceiptEndingEvent,
  ReleaseRitualPhase,
} from '../receiptEndingTypes'
import { createReleaseUndoUntil } from './releasePersistence'

export const RELEASE_RITUAL_TIMING = {
  cut: 180,
  unprintTotal: 220,
  unprintLines: 520,
  unprintReceiptNumber: 180,
  unprintAcknowledgment: 260,
  soften: 260,
  slotOpening: 180,
  receiving: 420,
  cornerHold: 100,
  slotClosing: 180,
} as const

export const RELEASE_RITUAL_EASING = {
  precise: 'cubic-bezier(.2, .65, .25, 1)',
  withdraw: 'cubic-bezier(.32, .02, .55, 1)',
  soften: 'cubic-bezier(.2, .55, .32, 1)',
  receive: 'cubic-bezier(.18, .72, .26, 1)',
  settle: 'cubic-bezier(.2, .6, .3, 1)',
} as const

export interface ReleasePhaseAdvance {
  delay: number
  event: ReceiptEndingEvent
}

export function getReleasePhaseAdvance(
  phase: ReleaseRitualPhase,
  reducedMotion: boolean,
  now: () => Date = () => new Date(),
): ReleasePhaseAdvance | null {
  const testHold = readTestPhaseHold()
  const duration = (standard: number, reduced = 100) => {
    if (testHold !== null) return testHold
    return reducedMotion ? Math.min(standard, reduced) : standard
  }

  switch (phase) {
    case 'cut':
      return { delay: duration(RELEASE_RITUAL_TIMING.cut, 90), event: { type: 'RELEASE_CUT_COMPLETED' } }
    case 'unprint-total':
      return { delay: duration(RELEASE_RITUAL_TIMING.unprintTotal, 90), event: { type: 'RELEASE_TOTAL_UNPRINTED' } }
    case 'unprint-lines':
      return { delay: duration(RELEASE_RITUAL_TIMING.unprintLines, 120), event: { type: 'RELEASE_LINES_UNPRINTED' } }
    case 'unprint-receipt-number':
      return { delay: duration(RELEASE_RITUAL_TIMING.unprintReceiptNumber, 90), event: { type: 'RELEASE_NUMBER_UNPRINTED' } }
    case 'unprint-acknowledgment':
      return { delay: duration(RELEASE_RITUAL_TIMING.unprintAcknowledgment, 100), event: { type: 'RELEASE_ACKNOWLEDGMENT_UNPRINTED' } }
    case 'soften':
      return { delay: duration(RELEASE_RITUAL_TIMING.soften, 100), event: { type: 'RELEASE_PAPER_SOFTENED' } }
    case 'slot-opening':
      return { delay: duration(RELEASE_RITUAL_TIMING.slotOpening, 90), event: { type: 'RELEASE_SLOT_OPENED' } }
    case 'receiving':
      return { delay: duration(RELEASE_RITUAL_TIMING.receiving, 120), event: { type: 'RELEASE_RECEIPT_RECEIVED' } }
    case 'corner-hold':
      return { delay: duration(RELEASE_RITUAL_TIMING.cornerHold, 90), event: { type: 'RELEASE_CORNER_HOLD_COMPLETED' } }
    case 'slot-closing':
      return {
        delay: duration(RELEASE_RITUAL_TIMING.slotClosing, 90),
        event: { type: 'RELEASE_SLOT_CLOSED', undoUntil: createReleaseUndoUntil(now()) },
      }
    case 'committing':
    case 'complete':
    case 'undoing':
      return null
  }
}

function readTestPhaseHold(): number | null {
  const raw = import.meta.env.VITE_RELEASE_RITUAL_TEST_HOLD_MS
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 50 ? parsed : null
}
