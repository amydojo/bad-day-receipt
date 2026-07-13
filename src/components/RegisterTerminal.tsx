import { currency, summarizeReceipt } from '../receipt'
import type { PrinterPhase } from '../printer/printerTypes'
import type { ReceiptTheme } from '../themes'
import type { ReceiptItem } from '../types'

export function getTerminalStatus(phase: PrinterPhase): string {
  switch (phase) {
    case 'idle': return 'UNCOMMITTED'
    case 'arming': return 'TRANSACTION ACCEPTED'
    case 'scanning': return 'SENDING TO PRINTER'
    case 'calculating': return 'SENDING TO PRINTER'
    case 'feeding': return 'PRINTING RECEIPT'
    case 'stamping': return 'AUTHORIZING DOCUMENT'
    case 'falseComplete': return 'PRINT COMPLETE'
    case 'printingCoupons': return 'ADDITIONAL REWARDS FOUND'
    case 'complete': return 'TRANSACTION RECORDED'
    case 'error': return 'REGISTER ERROR'
  }
}

export function shouldRenderIssuedReceipt(phase: PrinterPhase): boolean {
  return phase !== 'idle'
}

export function getMachineGeometry() {
  return { machine: 430, slot: 374, receipt: 346 }
}

export function RegisterTerminal({
  items,
  theme,
  phase,
}: {
  items: ReceiptItem[]
  theme: ReceiptTheme
  phase: PrinterPhase
}) {
  const summary = summarizeReceipt(items)
  const visibleItems = items.slice(-6)
  const compact = phase !== 'idle'

  return (
    <section
      className="pos-terminal"
      data-phase={phase}
      data-compact={compact}
      aria-label="Current register transaction"
    >
      <div className="register-screen">
        <div className="register-screen__header">
          <span>HUMAN CONDITION POS</span>
          <span>REGISTER 03</span>
        </div>

        {!compact && (
          <div className="register-screen__rows" aria-label="Selected items">
            {visibleItems.length === 0 ? (
              <div className="register-row register-row--empty">
                <span>&gt;</span><span>WAITING FOR ITEMS</span><strong>0.00</strong>
              </div>
            ) : visibleItems.map((item) => (
              <div className="register-row" key={item.id}>
                <span>{item.amount < 0 ? '<' : '>'}</span>
                <span>{item.label.toUpperCase()}</span>
                <strong>{currency(item.amount)}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="register-screen__summary">
          <span>ITEMS {String(items.length).padStart(2, '0')}</span>
          <strong>{currency(summary.total)}</strong>
        </div>

        <div className="register-screen__footer">
          <span>PAPER: {theme.shortName.toUpperCase()}</span>
          <strong>{getTerminalStatus(phase)}</strong>
        </div>

        <div className="register-scanline" aria-hidden="true" />
      </div>
    </section>
  )
}
