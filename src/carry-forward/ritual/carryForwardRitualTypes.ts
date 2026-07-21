import type { InteractionBudget } from '../interactionBudget'
import type { RemainingObligation } from '../designation/carryDesignationTypes'

export type CarryRitualPhase =
  | 'extension-printing'
  | 'extension-ready'
  | 'tear-tension'
  | 'stub-separated'
  | 'stub-aligning'
  | 'stub-intake'
  | 'actuator-revealing'
  | 'actuator-ready'
  | 'actuator-easy'
  | 'actuator-medium'
  | 'actuator-heavy'
  | 'actuator-detent'
  | 'actuator-locked'
  | 'transform-registering'
  | 'transfer-issuing'
  | 'transfer-issued'
  | 'released-early'
  | 'recovery'

export type ActuatorMilestone =
  | 'easy'
  | 'medium'
  | 'heavy'
  | 'detent'
  | 'locked'

export type CarryRitualRecoveryReason =
  | 'tear-canceled'
  | 'intake-jam'
  | 'conversion-failed'

export interface CarryRitualPayload {
  obligation: RemainingObligation
  sourceText: string
  budget: InteractionBudget
  origin: 'receipt'
  receiptId: string
}

export interface CarryRitualState {
  phase: CarryRitualPhase
  payload: CarryRitualPayload
  stubId: string
  actuatorProgress: number
  actuatorMilestone: ActuatorMilestone | null
  reachedMilestones: ActuatorMilestone[]
  recoveryReason: CarryRitualRecoveryReason | null
}

export type CarryRitualEvent =
  | { type: 'EXTENSION_PRINTED' }
  | { type: 'START_TEAR' }
  | { type: 'TEAR_RELEASED_EARLY' }
  | { type: 'STUB_SEPARATED' }
  | { type: 'START_ALIGNMENT' }
  | { type: 'STUB_ALIGNED' }
  | { type: 'INTAKE_COMPLETED' }
  | { type: 'ACTUATOR_REVEALED' }
  | {
      type: 'ACTUATOR_MILESTONE'
      milestone: ActuatorMilestone
      progress: number
    }
  | { type: 'ACTUATOR_RELEASED' }
  | { type: 'RESET_ACTUATOR' }
  | { type: 'LOCK_SETTLED' }
  | { type: 'TRANSFORM_REGISTERED' }
  | { type: 'TRANSFER_ISSUED' }
  | { type: 'FAIL'; reason: CarryRitualRecoveryReason }
  | { type: 'RECOVER' }

export interface CarryRitualHandoff {
  obligation: RemainingObligation
  sourceText: string
  budget: InteractionBudget
  origin: 'receipt'
  receiptId: string
  stubId: string
}
