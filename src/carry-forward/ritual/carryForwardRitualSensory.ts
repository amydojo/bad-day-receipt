import type {
  MachineSensoryDirector,
  MachineSensoryEvent,
} from '../../mobile-instrument/sensory/sensoryTypes'
import type { CarryRitualPhase } from './carryForwardRitualTypes'

const PHASE_MILESTONE: Partial<Record<CarryRitualPhase, MachineSensoryEvent>> = {
  'extension-printing': 'thermal-feed-start',
  'extension-ready': 'thermal-feed-stop',
  'stub-separated': 'carry-stub-tear',
  'stub-aligning': 'carry-intake-start',
  'actuator-revealing': 'carry-intake-stop',
  'actuator-medium': 'actuator-medium',
  'actuator-heavy': 'actuator-heavy',
  'actuator-detent': 'actuator-detent',
  'actuator-locked': 'actuator-lock',
  'transform-registering': 'transfer-register',
  'transfer-issuing': 'thermal-feed-start',
  'transfer-issued': 'transfer-issued',
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
  const milestone = PHASE_MILESTONE[phase]
  if (!sensory || !milestone || emitted.has(milestone)) return
  emitted.add(milestone)
  sensory.emit(milestone)
}

export function resetCarryActuatorSensoryEligibility(
  emitted: Set<MachineSensoryEvent>,
): void {
  for (const event of ACTUATOR_RETRY_EVENTS) emitted.delete(event)
}

export function getCarryRitualSensoryEvent(
  phase: CarryRitualPhase,
): MachineSensoryEvent | null {
  return PHASE_MILESTONE[phase] ?? null
}
