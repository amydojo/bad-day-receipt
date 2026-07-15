import type { PrinterPhase } from './printerTypes'

export type { MachineSensoryEvent as SensoryEvent } from '../mobile-instrument/sensory/sensoryTypes'

export const V4_MOTION = {
  selectionResponse: 180,
  commitResponse: 100,
  buttonDepression: 80,
  dockCompression: 420,
  chamberSettle: 320,
  preScanBreath: 180,
  scannerSweep: 520,
  postScanBreath: 180,
  printerWake: 180,
  blankPaperHold: 120,
  blankLeaderReveal: 220,
  receiptFeed: 760,
  verdictSilence: 680,
  verdictImpact: 220,
  evidenceSettlement: 360,
  cvsPrimaryReceiptFeed: 820,
  cvsCompletionSettle: 220,
  cvsApparentCompletion: 180,
  cvsFalseEndingSilence: 1080,
  cvsAdditionalRewardsReveal: 180,
  cvsMessageReadingHold: 300,
  cvsPrinterRestart: 220,
  cvsCouponFeed: 980,
  cvsTrueCompleteHold: 520,
} as const

export const REDUCED_MOTION = {
  accepted: 50,
  scanned: 70,
  blankPaper: 60,
  printedEvidence: 90,
  apparentCompletion: 120,
  couponReveal: 140,
  complete: 80,
} as const

export type MotionMilestone =
  | 'compose'
  | 'commit'
  | 'compressing'
  | 'chamber'
  | 'scan-ready'
  | 'scanning'
  | 'printer-wake'
  | 'blank-paper'
  | 'feeding'
  | 'apparent-complete'
  | 'coupon-restart'
  | 'coupon-feeding'
  | 'verdict'
  | 'artifact'
  | 'error'

export function milestoneForPhase(phase: PrinterPhase): MotionMilestone {
  switch (phase) {
    case 'idle': return 'compose'
    case 'arming': return 'chamber'
    case 'scanning': return 'scanning'
    case 'calculating': return 'printer-wake'
    case 'feeding': return 'feeding'
    case 'stamping': return 'verdict'
    case 'falseComplete': return 'apparent-complete'
    case 'printingCoupons': return 'coupon-feeding'
    case 'complete': return 'artifact'
    case 'error': return 'error'
  }
}

export const STANDARD_V4_TOTAL =
  V4_MOTION.commitResponse +
  V4_MOTION.buttonDepression +
  V4_MOTION.dockCompression +
  V4_MOTION.chamberSettle +
  V4_MOTION.preScanBreath +
  V4_MOTION.scannerSweep +
  V4_MOTION.postScanBreath +
  V4_MOTION.printerWake +
  V4_MOTION.blankPaperHold +
  V4_MOTION.blankLeaderReveal +
  V4_MOTION.receiptFeed +
  V4_MOTION.verdictSilence +
  V4_MOTION.verdictImpact +
  V4_MOTION.evidenceSettlement

export const CVS_V4_TOTAL =
  STANDARD_V4_TOTAL - V4_MOTION.receiptFeed +
  V4_MOTION.cvsPrimaryReceiptFeed +
  V4_MOTION.cvsCompletionSettle +
  V4_MOTION.cvsApparentCompletion +
  V4_MOTION.cvsFalseEndingSilence +
  V4_MOTION.cvsAdditionalRewardsReveal +
  V4_MOTION.cvsMessageReadingHold +
  V4_MOTION.cvsPrinterRestart +
  V4_MOTION.cvsCouponFeed +
  V4_MOTION.cvsTrueCompleteHold
