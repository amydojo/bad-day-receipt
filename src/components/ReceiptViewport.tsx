import type { CSSProperties, ReactNode } from 'react'
import type { PrinterPhase } from '../printer/printerTypes'
import { PrintHeadBand } from './PrintHeadBand'

interface ReceiptViewportProps {
  children: ReactNode
  paperProgress: number
  couponProgress: number
  phase: PrinterPhase
  couponCount: number
}

export function ReceiptViewport({
  children,
  paperProgress,
  couponProgress,
  phase,
  couponCount,
}: ReceiptViewportProps) {
  const hiddenDistance = couponCount > 0 ? 230 : 190
  const couponDistance = Math.min(28, couponCount * 3.2)
  const couponOffset = ['printingCoupons', 'complete'].includes(phase)
    ? couponDistance * couponProgress
    : 0
  const paperOffset = -hiddenDistance * (1 - paperProgress) + couponOffset

  return (
    <div className="receipt-viewport" data-phase={phase}>
      <div className="machine-under-shadow" aria-hidden="true" />
      <div className="paper-contact-shadow" aria-hidden="true" />
      <div className="paper-pressure-shadow" aria-hidden="true" />
      <div
        className="receipt-track receipt-wrap"
        style={{ '--paper-offset': `${paperOffset}px` } as CSSProperties}
      >
        <div className="receipt-paper-neck">{children}</div>
      </div>
      <PrintHeadBand phase={phase} />
    </div>
  )
}
