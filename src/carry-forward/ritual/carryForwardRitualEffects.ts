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

export const FALLBACK_ACTUATOR_STEPS = [
  { milestone: 'easy', progress: 0.25 },
  { milestone: 'medium', progress: 0.6 },
  { milestone: 'heavy', progress: 0.84 },
  { milestone: 'detent', progress: 0.94 },
  { milestone: 'locked', progress: 1 },
] as const satisfies ReadonlyArray<{
  milestone: ActuatorMilestone
  progress: number
}>

export function getNextFallbackActuatorEvent(
  current: ActuatorMilestone | null,
): CarryRitualEvent {
  const currentIndex = current === null
    ? -1
    : FALLBACK_ACTUATOR_STEPS.findIndex((step) => step.milestone === current)
  const next = FALLBACK_ACTUATOR_STEPS[Math.min(
    FALLBACK_ACTUATOR_STEPS.length - 1,
    currentIndex + 1,
  )]
  return {
    type: 'ACTUATOR_MILESTONE',
    milestone: next.milestone,
    progress: next.progress,
  }
}

export function getFallbackActuatorSequence(): Array<{
  delay: number
  event: CarryRitualEvent
}> {
  const delays = [0, 90, 190, 310, 430]
  return FALLBACK_ACTUATOR_STEPS.map((step, index) => ({
    delay: delays[index],
    event: {
      type: 'ACTUATOR_MILESTONE',
      milestone: step.milestone,
      progress: step.progress,
    },
  }))
}
