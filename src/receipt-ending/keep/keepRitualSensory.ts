import type {
  MachineSensoryDirector,
  MachineSensoryEvent,
} from '../../mobile-instrument/sensory/sensoryTypes'
import type { KeepRitualPhase } from '../receiptEndingTypes'

const PHASE_MILESTONE: Partial<Record<KeepRitualPhase, MachineSensoryEvent>> = {
  cut: 'receipt-cut',
  align: 'archive-align',
  'sleeve-receiving': 'sleeve-receive',
  'label-registering': 'archive-label',
  'archive-closing': 'archive-close',
}

export function emitKeepRitualMilestone({
  sensory,
  receiptNumber,
  phase,
  emitted,
}: {
  sensory: MachineSensoryDirector
  receiptNumber: string
  phase: KeepRitualPhase
  emitted: Set<string>
}): void {
  const milestone = PHASE_MILESTONE[phase]
  if (!milestone) return

  const key = `${receiptNumber}:${milestone}`
  if (emitted.has(key)) return
  emitted.add(key)
  sensory.emit(milestone)
}
