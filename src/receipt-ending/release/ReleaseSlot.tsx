import type { ReleaseRitualPhase } from '../receiptEndingTypes'

export type PrinterReleaseState =
  | 'closed'
  | 'opening'
  | 'open'
  | 'receiving'
  | 'corner-hold'
  | 'closing'
  | 'released'
  | 'recovery'

export function getPrinterReleaseState(
  phase?: ReleaseRitualPhase,
  recovery = false,
): PrinterReleaseState {
  if (recovery) return 'recovery'
  switch (phase) {
    case 'slot-opening': return 'opening'
    case 'receiving': return 'receiving'
    case 'corner-hold': return 'corner-hold'
    case 'slot-closing':
    case 'committing': return 'closing'
    case 'complete':
    case 'undoing': return 'released'
    default: return 'closed'
  }
}

export function ReleaseSlot({
  state = 'closed',
}: {
  state?: PrinterReleaseState
}) {
  return (
    <div
      className="printer-release-slot"
      data-printer-region="release-slot"
      data-release-slot-state={state}
      aria-hidden="true"
    >
      <div className="printer-release-slot__void" />
      <div className="printer-release-slot__lip" />
      <span>CLOSED</span>
    </div>
  )
}
