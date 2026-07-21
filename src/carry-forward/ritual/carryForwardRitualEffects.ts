import { ACTUATOR_THRESHOLDS } from './carryForwardRitualThresholds'
import { getCarryRitualDuration } from './carryForwardRitualMotion'
import type {
  ActuatorMilestone,
  CarryRitualEvent,
  CarryRitualPhase,
  CarryRitualState,
} from './carryForwardRitualTypes'

export interface CarryRitualPhaseAdvance {
  delay: number
  event: CarryRitualEvent
}

export function getCarryRitualPhaseAdvance(
  phase: CarryRitualPhase,
  reducedMotion: boolean,
): CarryRitualPhaseAdvance | null {
  const delay = getCarryRitualDuration(phase, reducedMotion)
  switch (phase) {
    case 'extension-printing':
      return { delay, event: { type: 'EXTENSION_PRINTED' } }
    case 'stub-aligning':
      return { delay, event: { type: 'STUB_ALIGNED' } }
    case 'stub-intake':
      return { delay, event: { type: 'INTAKE_COMPLETED' } }
    case 'actuator-revealing':
      return { delay, event: { type: 'ACTUATOR_REVEALED' } }
    case 'actuator-locked':
      return { delay: ACTUATOR_THRESHOLDS.lockDurationMs, event: { type: 'LOCK_SETTLED' } }
    case 'transform-registering':
      return { delay, event: { type: 'TRANSFORM_REGISTERED' } }
    case 'transfer-issuing':
      return { delay, event: { type: 'TRANSFER_ISSUED' } }
    default:
      return null
  }
}

export interface CarryRitualCheckpoint {
  version: 1
  phase: CarryRitualPhase
  receiptId: string
  stubId: string
  actuatorMilestone: ActuatorMilestone | null
}

const PERSISTABLE_PHASES = new Set<CarryRitualPhase>([
  'extension-ready',
  'stub-separated',
  'actuator-ready',
  'transfer-issued',
  'recovery',
])

export function isCarryRitualPersistablePhase(phase: CarryRitualPhase) {
  return PERSISTABLE_PHASES.has(phase)
}

export function createCarryRitualCheckpoint(
  state: CarryRitualState,
): CarryRitualCheckpoint | null {
  if (!isCarryRitualPersistablePhase(state.phase)) return null
  return {
    version: 1,
    phase: state.phase,
    receiptId: state.payload.receiptId,
    stubId: state.stubId,
    actuatorMilestone: state.actuatorMilestone,
  }
}

export function getFallbackActuatorSequence(): Array<{
  delay: number
  event: CarryRitualEvent
}> {
  return [
    { delay: 0, event: { type: 'ACTUATOR_MILESTONE', milestone: 'easy', progress: 0.25 } },
    { delay: 90, event: { type: 'ACTUATOR_MILESTONE', milestone: 'medium', progress: 0.6 } },
    { delay: 190, event: { type: 'ACTUATOR_MILESTONE', milestone: 'heavy', progress: 0.84 } },
    { delay: 310, event: { type: 'ACTUATOR_MILESTONE', milestone: 'detent', progress: 0.94 } },
    { delay: 430, event: { type: 'ACTUATOR_MILESTONE', milestone: 'locked', progress: 1 } },
  ]
}
