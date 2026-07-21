import type { MachineSensoryDirector } from '../../mobile-instrument/sensory/sensoryTypes'
import type { CarryRitualPhase } from './carryForwardRitualTypes'

const PHASE_EVENT = {
  'extension-printing': 'thermal-feed-start',
  'extension-ready': 'thermal-feed-stop',
  'stub-separated': 'receipt-cut',
  'stub-aligning': 'archive-align',
  'stub-intake': 'sleeve-receive',
  'actuator-detent': 'paper-tension-release',
  'actuator-locked': 'archive-close',
  'transfer-issuing': 'thermal-feed-start',
  'transfer-issued': 'thermal-feed-stop',
  recovery: 'machine-error',
} as const

export function emitCarryRitualMilestone({
  sensory,
  phase,
  emitted,
}: {
  sensory?: MachineSensoryDirector
  phase: CarryRitualPhase
  emitted: Set<CarryRitualPhase>
}) {
  if (!sensory || emitted.has(phase)) return
  const event = PHASE_EVENT[phase as keyof typeof PHASE_EVENT]
  if (!event) return
  emitted.add(phase)
  sensory.emit(event)
}
