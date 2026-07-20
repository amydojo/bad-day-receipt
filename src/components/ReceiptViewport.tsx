import type { CSSProperties, ReactNode } from 'react'
import type { PrinterPhase } from '../printer/printerTypes'
import type { KeepRitualPhase } from '../receipt-ending/receiptEndingTypes'
import { PrintHeadBand } from './PrintHeadBand'

interface ReceiptViewportProps {
  children: ReactNode
  materialLayer?: ReactNode
  paperProgress: number
  couponProgress: number
  phase: PrinterPhase
  couponCount: number
  keepPhase?: KeepRitualPhase
}

export function ReceiptViewport({
  children,
  materialLayer,
  paperProgress,
  couponProgress,
  phase,
  couponCount,
  keepPhase,
}: ReceiptViewportProps) {
  const hiddenDistance = couponCount > 0 ? 230 : 190
  const couponDistance = Math.min(28, couponCount * 3.2)
  const couponOffset = ['printingCoupons', 'complete'].includes(phase)
    ? couponDistance * couponProgress
    : 0
  const paperOffset = -hiddenDistance * (1 - paperProgress) + couponOffset

  return (
    <div className="receipt-viewport" data-phase={phase} data-keep-phase={keepPhase}>
      <div className="machine-under-shadow" aria-hidden="true" />
      <div className="paper-contact-shadow" aria-hidden="true" />
      <div className="paper-pressure-shadow" aria-hidden="true" />
      <div
        className="receipt-track receipt-wrap"
        style={{ '--paper-offset': `${paperOffset}px` } as CSSProperties}
      >
        <div className="receipt-paper-neck">
          <div className="receipt-material-stack" data-keep-phase={keepPhase}>
            <div
              className="receipt-material-stack__sleeve"
              style={{ position: 'absolute', inset: 0, zIndex: 1 }}
              aria-hidden="true"
            >
              {materialLayer}
            </div>
            {children}
          </div>
        </div>
      </div>
      <PrintHeadBand phase={phase} />
    </div>
  )
}
