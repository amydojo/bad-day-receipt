import type { KeepRitualPhase } from '../receiptEndingTypes'

export type ArchivalSleeveState =
  | 'hidden'
  | 'rising'
  | 'receiving'
  | 'sleeved'
  | 'archiving'
  | 'archived'
  | 'recovery'

export function ArchivalSleeve({
  phase,
  recovery = false,
}: {
  phase?: KeepRitualPhase
  recovery?: boolean
}) {
  const state = getArchivalSleeveState(phase, recovery)

  return (
    <div
      className="archival-sleeve"
      data-archival-sleeve
      data-sleeve-state={state}
      aria-hidden="true"
    >
      <div className="archival-sleeve__material" />
      <div className="archival-sleeve__edge" />
      <div className="archival-sleeve__highlight" />
      <div className="archival-sleeve__friction" />
    </div>
  )
}

export function getArchivalSleeveState(
  phase?: KeepRitualPhase,
  recovery = false,
): ArchivalSleeveState {
  if (recovery) return 'recovery'
  switch (phase) {
    case 'sleeve-rising': return 'rising'
    case 'sleeve-receiving': return 'receiving'
    case 'label-registering':
    case 'archive-opening': return 'sleeved'
    case 'archiving': return 'archiving'
    case 'archive-closing': return 'archived'
    case 'complete': return 'archived'
    default: return 'hidden'
  }
}
