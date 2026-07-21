import {
  RECEIPT_ENDING_EASING,
  RECEIPT_ENDING_TIMING,
  resolveRitualDuration,
} from '../../motion/receiptEndingMotion'
import type {
  ReceiptEndingEvent,
  ReleaseRitualPhase,
} from '../receiptEndingTypes'
import { createReleaseUndoUntil } from './releasePersistence'

export const RELEASE_RITUAL_TIMING = RECEIPT_ENDING_TIMING.release

export const RELEASE_RITUAL_EASING = {
  precise: RECEIPT_ENDING_EASING.precise,
  withdraw: RECEIPT_ENDING_EASING.release,
  soften: RECEIPT_ENDING_EASING.soften,
  receive: RECEIPT_ENDING_EASING.resistant,
  settle: RECEIPT_ENDING_EASING.settle,
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
  const duration = (standard: number, reduced = 100) => resolveRitualDuration({
    standard,
    reducedMotion,
    reducedCap: reduced,
    testHold,
  })

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
