export const RECEIPT_ENDING_DURATION = {
  instant: 0,
  fast: 120,
  standard: 220,
  ritual: 420,
  hold: 100,
} as const

export const RECEIPT_ENDING_EASING = {
  precise: 'cubic-bezier(.2, .65, .25, 1)',
  magnetic: 'cubic-bezier(.24, .82, .34, 1)',
  release: 'cubic-bezier(.32, .02, .55, 1)',
  resistant: 'cubic-bezier(.18, .72, .26, 1)',
  soften: 'cubic-bezier(.2, .55, .32, 1)',
  settle: 'cubic-bezier(.2, .6, .3, 1)',
} as const

export const RECEIPT_ENDING_TIMING = {
  keep: {
    cut: 180,
    align: 120,
    sleeveRising: 360,
    sleeveReceiving: 420,
    labelRegistering: 420,
    archiveOpening: 240,
    archiving: 520,
    archiveClosing: 220,
    completionStillness: 320,
  },
  release: {
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
  },
  carry: {
    extensionPrintMs: 780,
    stubAlignMs: 320,
    stubIntakeMs: 520,
    actuatorRevealMs: 420,
    transformRegisterMs: 680,
    transferIssueMs: 620,
    reducedTransitionMs: 80,
  },
} as const

export function resolveRitualDuration({
  standard,
  reducedMotion,
  reducedCap = RECEIPT_ENDING_DURATION.hold,
  testHold,
}: {
  standard: number
  reducedMotion: boolean
  reducedCap?: number
  testHold?: number | null
}): number {
  if (testHold !== null && testHold !== undefined) return testHold
  return reducedMotion ? Math.min(standard, reducedCap) : standard
}
