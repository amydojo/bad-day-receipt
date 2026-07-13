import type { PrinterPhase } from '../printer/printerTypes'

export function PrintHeadBand({ phase }: { phase: PrinterPhase }) {
  const active = ['scanning', 'feeding', 'printingCoupons'].includes(phase)

  return (
    <div
      className={`print-head-band ${active ? 'is-active' : ''}`}
      aria-hidden="true"
    />
  )
}
