import type {
  MachineSensoryDirector,
  MachineSensoryEvent,
} from '../../mobile-instrument/sensory/sensoryTypes'
import type { ReleaseRitualPhase } from '../receiptEndingTypes'

const PHASE_MILESTONE: Partial<Record<ReleaseRitualPhase, MachineSensoryEvent>> = {
  cut: 'receipt-cut',
  'unprint-total': 'thermal-unprint-start',
  soften: 'paper-tension-release',
  'corner-hold': 'release-corner',
  'slot-closing': 'release-close',
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
  const milestone = PHASE_MILESTONE[phase]
  if (!milestone) return

  const key = `${receiptNumber}:${milestone}`
  if (emitted.has(key)) return
  emitted.add(key)
  sensory.emit(milestone)
}
