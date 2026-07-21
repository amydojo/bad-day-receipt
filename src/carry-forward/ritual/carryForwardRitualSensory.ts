import type {
  MachineSensoryDirector,
  MachineSensoryEvent,
} from '../../mobile-instrument/sensory/sensoryTypes'
import type { CarryRitualPhase } from './carryForwardRitualTypes'

const PHASE_MILESTONES: Partial<Record<CarryRitualPhase, readonly MachineSensoryEvent[]>> = {
  'extension-printing': ['thermal-feed-start'],
  'extension-ready': ['thermal-feed-stop'],
  'stub-separated': ['carry-stub-tear'],
  'stub-aligning': ['carry-intake-start'],
  'actuator-revealing': ['carry-intake-stop'],
  'actuator-medium': ['actuator-medium'],
  'actuator-heavy': ['actuator-heavy'],
  'actuator-detent': ['actuator-detent'],
  'actuator-locked': ['actuator-lock'],
  'transform-registering': ['transfer-register'],
  'transfer-issuing': ['thermal-feed-start'],
  'transfer-issued': ['thermal-feed-stop', 'transfer-issued'],
}

const ACTUATOR_RETRY_EVENTS: readonly MachineSensoryEvent[] = [
  'actuator-medium',
  'actuator-heavy',
  'actuator-detent',
  'actuator-lock',
]

export function emitCarryRitualMilestone({
  sensory,
  phase,
  emitted,
}: {
  sensory?: MachineSensoryDirector
  phase: CarryRitualPhase
  emitted: Set<MachineSensoryEvent>
}): void {
  const milestones = PHASE_MILESTONES[phase]
  if (!sensory || !milestones) return
  for (const milestone of milestones) {
    if (emitted.has(milestone)) continue
    emitted.add(milestone)
    sensory.emit(milestone)
  }
}

export function resetCarryActuatorSensoryEligibility(
  emitted: Set<MachineSensoryEvent>,
): void {
  for (const event of ACTUATOR_RETRY_EVENTS) emitted.delete(event)
}

export function getCarryRitualSensoryEvents(
  phase: CarryRitualPhase,
): readonly MachineSensoryEvent[] {
  return PHASE_MILESTONES[phase] ?? []
}
