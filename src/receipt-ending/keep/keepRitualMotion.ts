import {
  RECEIPT_ENDING_EASING,
  RECEIPT_ENDING_TIMING,
  resolveRitualDuration,
} from '../../motion/receiptEndingMotion'
import type {
  KeepRitualPhase,
  ReceiptEndingEvent,
} from '../receiptEndingTypes'

export const KEEP_RITUAL_TIMING = RECEIPT_ENDING_TIMING.keep

export const KEEP_RITUAL_EASING = {
  precise: RECEIPT_ENDING_EASING.precise,
  magnetic: RECEIPT_ENDING_EASING.magnetic,
  friction: RECEIPT_ENDING_EASING.resistant,
  settle: RECEIPT_ENDING_EASING.settle,
} as const

export interface KeepPhaseAdvance {
  delay: number
  event: ReceiptEndingEvent
}

export function getKeepPhaseAdvance(
  phase: KeepRitualPhase,
  reducedMotion: boolean,
  now: () => string = () => new Date().toISOString(),
): KeepPhaseAdvance | null {
  const testHold = readTestPhaseHold()
  const duration = (standard: number, reduced = 100) => resolveRitualDuration({
    standard,
    reducedMotion,
    reducedCap: reduced,
    testHold,
  })

  switch (phase) {
    case 'cut':
      return {
        delay: duration(KEEP_RITUAL_TIMING.cut, 90),
        event: { type: 'KEEP_CUT_COMPLETED' },
      }
    case 'align':
      return {
        delay: duration(KEEP_RITUAL_TIMING.align, 80),
        event: { type: 'KEEP_ALIGNMENT_COMPLETED' },
      }
    case 'sleeve-rising':
      return {
        delay: duration(KEEP_RITUAL_TIMING.sleeveRising, 100),
        event: { type: 'KEEP_SLEEVE_RAISED' },
      }
    case 'sleeve-receiving':
      return {
        delay: duration(KEEP_RITUAL_TIMING.sleeveReceiving, 110),
        event: { type: 'KEEP_RECEIPT_SLEEVED' },
      }
    case 'label-registering':
      return {
        delay: duration(KEEP_RITUAL_TIMING.labelRegistering, 110),
        event: { type: 'KEEP_LABEL_REGISTERED' },
      }
    case 'archive-opening':
      return {
        delay: duration(KEEP_RITUAL_TIMING.archiveOpening, 90),
        event: { type: 'KEEP_ARCHIVE_OPENED' },
      }
    case 'archiving':
      return {
        delay: duration(KEEP_RITUAL_TIMING.archiving, 120),
        event: { type: 'KEEP_RECEIPT_INSERTED' },
      }
    case 'archive-closing':
      return {
        delay: duration(KEEP_RITUAL_TIMING.archiveClosing, 90),
        event: { type: 'KEEP_ARCHIVE_CLOSED', archivedAt: now() },
      }
    case 'complete':
      return null
  }
}

function readTestPhaseHold(): number | null {
  const raw = import.meta.env.VITE_KEEP_RITUAL_TEST_HOLD_MS
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 50 ? parsed : null
}
