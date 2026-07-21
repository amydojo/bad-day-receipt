import type { ReleaseRitualPhase } from '../receiptEndingTypes'

export function ThermalUnprintLayer({
  phase,
}: {
  phase?: ReleaseRitualPhase
}) {
  if (!phase) return null

  return (
    <div
      className="thermal-unprint-layer"
      data-release-phase={phase}
      aria-hidden="true"
    >
      <div className="thermal-unprint-layer__heat" />
      <div className="thermal-unprint-layer__edge" />
    </div>
  )
}
