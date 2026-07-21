import type { CSSProperties } from 'react'
import { getLedStatus, getPrinterStatus } from '../printer/printerMachine'
import type { PrinterPhase } from '../printer/printerTypes'
import {
  ReleaseSlot,
  type PrinterReleaseState,
} from '../receipt-ending/release/ReleaseSlot'
import type { ReceiptTheme } from '../themes'

export type PrinterArchiveState =
  | 'closed'
  | 'opening'
  | 'open'
  | 'receiving'
  | 'closing'
  | 'stored'
  | 'recovery'

interface PrinterShellProps {
  phase: PrinterPhase
  theme: ReceiptTheme
  statusOverride?: string
  mode?: 'receipt' | 'archive' | 'release'
  archiveState?: PrinterArchiveState
  releaseState?: PrinterReleaseState
}

export function PrinterShell({
  phase,
  theme,
  statusOverride,
  mode = 'receipt',
  archiveState = 'closed',
  releaseState = 'closed',
}: PrinterShellProps) {
  return (
    <div
      className="printer-shell"
      style={{ '--printer-accent': theme.palette.accent } as CSSProperties}
      data-printer-shell
      data-printer-mode={mode}
      data-archive-state={archiveState}
      data-release-state={releaseState}
    >
      <div className="printer-shell__top">
        <div>
          <span className="printer-shell__brand">HUMAN CONDITION POS</span>
          <span className="printer-shell__model">
            THERMAL UNIT 001 · {theme.shortName}
          </span>
        </div>

        <PrinterStatus phase={phase} statusOverride={statusOverride} />
      </div>

      <div className="printer-slot" aria-hidden="true">
        <div className="printer-slot__void" />
        <div className="printer-slot__roller" />
        <div className="printer-slot__lip" />
      </div>
      <div className="tear-bar" aria-hidden="true" />

      <div
        className="printer-archive-bay"
        data-printer-region="archive-bay"
        aria-hidden="true"
      >
        <div className="printer-archive-bay__recess" />
        <div className="printer-archive-bay__drawer">
          <span>PRIVATE ARCHIVE</span>
          <i />
        </div>
        <div className="printer-archive-bay__occlusion" />
      </div>

      <ReleaseSlot state={releaseState} />
    </div>
  )
}

function PrinterStatus({
  phase,
  statusOverride,
}: {
  phase: PrinterPhase
  statusOverride?: string
}) {
  return (
    <div className="printer-status">
      <span className="printer-status__label">
        {statusOverride ?? getPrinterStatus(phase)}
      </span>
      <span
        className="printer-status__led"
        data-status={getLedStatus(phase)}
        aria-hidden="true"
      />
    </div>
  )
}
