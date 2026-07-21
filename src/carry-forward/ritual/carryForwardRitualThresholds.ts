import type { ActuatorMilestone } from './carryForwardRitualTypes'

export const ACTUATOR_THRESHOLDS = {
  medium: 0.55,
  heavy: 0.8,
  detent: 0.92,
  locked: 1,
  lockDurationMs: 120,
} as const

export const TEAR_THRESHOLDS = {
  tension: 0.24,
  separated: 0.72,
} as const

export const INTAKE_THRESHOLDS = {
  aligned: 0.46,
  captured: 0.78,
} as const

export function clampUnit(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function getActuatorMilestone(progress: number): ActuatorMilestone {
  const normalized = clampUnit(progress)
  if (normalized >= ACTUATOR_THRESHOLDS.locked) return 'locked'
  if (normalized >= ACTUATOR_THRESHOLDS.detent) return 'detent'
  if (normalized >= ACTUATOR_THRESHOLDS.heavy) return 'heavy'
  if (normalized >= ACTUATOR_THRESHOLDS.medium) return 'medium'
  return 'easy'
}

export function getActuatorResistance(progress: number) {
  const normalized = clampUnit(progress)
  if (normalized < ACTUATOR_THRESHOLDS.medium) return normalized
  if (normalized < ACTUATOR_THRESHOLDS.heavy) {
    const segment = (normalized - ACTUATOR_THRESHOLDS.medium)
      / (ACTUATOR_THRESHOLDS.heavy - ACTUATOR_THRESHOLDS.medium)
    return ACTUATOR_THRESHOLDS.medium + segment * 0.16
  }
  if (normalized < ACTUATOR_THRESHOLDS.detent) {
    const segment = (normalized - ACTUATOR_THRESHOLDS.heavy)
      / (ACTUATOR_THRESHOLDS.detent - ACTUATOR_THRESHOLDS.heavy)
    return 0.71 + segment * 0.08
  }
  const segment = (normalized - ACTUATOR_THRESHOLDS.detent)
    / (ACTUATOR_THRESHOLDS.locked - ACTUATOR_THRESHOLDS.detent)
  return 0.79 + segment * 0.21
}

export function shouldSeparateStub(progress: number) {
  return clampUnit(progress) >= TEAR_THRESHOLDS.separated
}

export function shouldCaptureStub(progress: number) {
  return clampUnit(progress) >= INTAKE_THRESHOLDS.captured
}
