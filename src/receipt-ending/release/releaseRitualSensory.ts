import type {
  MachineSensoryDirector,
  MachineSensoryEvent,
} from '../../mobile-instrument/sensory/sensoryTypes'
import type { ReleaseRitualPhase } from '../receiptEndingTypes'

const PHASE_MILESTONES: Partial<Record<ReleaseRitualPhase, readonly MachineSensoryEvent[]>> = {
  cut: ['receipt-cut'],
  'unprint-total': ['thermal-unprint-start'],
  soften: ['thermal-unprint-complete'],
  'slot-opening': ['paper-tension-release'],
  'corner-hold': ['release-corner'],
  'slot-closing': ['release-close'],
}

export function emitReleaseRitualMilestone({
  sensory,
  receiptNumber,
  phase,
  emitted,
}: {
  sensory: MachineSensoryDirector
  receiptNumber: string
  phase: ReleaseRitualPhase
  emitted: Set<string>
}): void {
  const milestones = PHASE_MILESTONES[phase]
  if (!milestones) return

  for (const milestone of milestones) {
    const key = `${receiptNumber}:${milestone}`
    if (emitted.has(key)) continue
    emitted.add(key)
    sensory.emit(milestone)
  }
}
