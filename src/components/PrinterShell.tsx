import type { CSSProperties } from 'react'
import { getLedStatus, getPrinterStatus } from '../printer/printerMachine'
import type { PrinterPhase } from '../printer/printerTypes'
import type { ReceiptTheme } from '../themes'

interface PrinterShellProps {
  phase: PrinterPhase
  theme: ReceiptTheme
}

export function PrinterShell({ phase, theme }: PrinterShellProps) {
  return (
    <div
      className="printer-shell"
      style={{ '--printer-accent': theme.palette.accent } as CSSProperties}
    >
      <div className="printer-shell__top">
        <div>
          <span className="printer-shell__brand">HUMAN CONDITION POS</span>
          <span className="printer-shell__model">
            THERMAL UNIT 001 · {theme.shortName}
          </span>
        </div>

        <PrinterStatus phase={phase} />
      </div>

      <div className="printer-slot" aria-hidden="true">
        <div className="printer-slot__void" />
        <div className="printer-slot__roller" />
        <div className="printer-slot__lip" />
      </div>
      <div className="tear-bar" aria-hidden="true" />
    </div>
  )
}

function PrinterStatus({ phase }: { phase: PrinterPhase }) {
  return (
    <div className="printer-status">
      <span className="printer-status__label">{getPrinterStatus(phase)}</span>
      <span
        className="printer-status__led"
        data-status={getLedStatus(phase)}
        aria-hidden="true"
      />
    </div>
  )
}
