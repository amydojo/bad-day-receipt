import { ACTUATOR_THRESHOLDS } from './carryForwardRitualThresholds'
import { getCarryRitualDuration } from './carryForwardRitualMotion'
import type {
  ActuatorMilestone,
  CarryRitualEvent,
  CarryRitualPhase,
  CarryRitualRecoveryReason,
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
  recoveryReason: CarryRitualRecoveryReason | null
}

export const CARRY_RITUAL_CHECKPOINT_KEY = 'bad-day-receipt:carry-ritual-checkpoint:v1'

const PERSISTABLE_PHASES = new Set<CarryRitualPhase>([
  'extension-ready',
  'stub-separated',
  'actuator-ready',
  'transfer-issued',
  'recovery',
])

const ACTUATOR_MILESTONES = new Set<ActuatorMilestone>([
  'easy',
  'medium',
  'heavy',
  'detent',
  'locked',
])

const RECOVERY_REASONS = new Set<CarryRitualRecoveryReason>([
  'tear-canceled',
  'intake-jam',
  'conversion-failed',
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
    recoveryReason: state.recoveryReason,
  }
}

interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function saveCarryRitualCheckpoint(
  storage: StorageAdapter,
  checkpoint: CarryRitualCheckpoint,
) {
  try {
    storage.setItem(CARRY_RITUAL_CHECKPOINT_KEY, JSON.stringify(checkpoint))
    return true
  } catch {
    return false
  }
}

export function loadCarryRitualCheckpoint(
  storage: StorageAdapter,
): CarryRitualCheckpoint | null {
  try {
    const raw = storage.getItem(CARRY_RITUAL_CHECKPOINT_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    if (record.version !== 1) return null
    if (typeof record.phase !== 'string' || !PERSISTABLE_PHASES.has(record.phase as CarryRitualPhase)) return null
    if (typeof record.receiptId !== 'string' || record.receiptId.length < 1) return null
    if (typeof record.stubId !== 'string' || record.stubId.length < 1) return null
    if (record.actuatorMilestone !== null && (
      typeof record.actuatorMilestone !== 'string'
      || !ACTUATOR_MILESTONES.has(record.actuatorMilestone as ActuatorMilestone)
    )) return null
    if (record.recoveryReason !== null && (
      typeof record.recoveryReason !== 'string'
      || !RECOVERY_REASONS.has(record.recoveryReason as CarryRitualRecoveryReason)
    )) return null
    return {
      version: 1,
      phase: record.phase as CarryRitualPhase,
      receiptId: record.receiptId,
      stubId: record.stubId,
      actuatorMilestone: record.actuatorMilestone as ActuatorMilestone | null,
      recoveryReason: record.recoveryReason as CarryRitualRecoveryReason | null,
    }
  } catch {
    return null
  }
}

export function clearCarryRitualCheckpoint(storage: StorageAdapter) {
  try {
    storage.removeItem(CARRY_RITUAL_CHECKPOINT_KEY)
    return true
  } catch {
    return false
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
