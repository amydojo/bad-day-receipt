import { RECEIPT_ENDING_TIMING } from '../../motion/receiptEndingMotion'
import type { CarryRitualPhase } from './carryForwardRitualTypes'

export const CARRY_RITUAL_MOTION = {
  ...RECEIPT_ENDING_TIMING.carry,
  tearDistancePx: 92,
  intakeDistancePx: 116,
  actuatorTravelPx: 148,
} as const

export function getCarryRitualDuration(
  phase: CarryRitualPhase,
  reducedMotion: boolean,
) {
  if (reducedMotion) return CARRY_RITUAL_MOTION.reducedTransitionMs
  switch (phase) {
    case 'extension-printing':
      return CARRY_RITUAL_MOTION.extensionPrintMs
    case 'stub-aligning':
      return CARRY_RITUAL_MOTION.stubAlignMs
    case 'stub-intake':
      return CARRY_RITUAL_MOTION.stubIntakeMs
    case 'actuator-revealing':
      return CARRY_RITUAL_MOTION.actuatorRevealMs
    case 'transform-registering':
      return CARRY_RITUAL_MOTION.transformRegisterMs
    case 'transfer-issuing':
      return CARRY_RITUAL_MOTION.transferIssueMs
    default:
      return 0
  }
}

export function getStubRotation(stubId: string) {
  let hash = 0
  for (const character of stubId) hash = ((hash * 31) + character.charCodeAt(0)) | 0
  return ((Math.abs(hash) % 9) - 4) * 0.22
}
