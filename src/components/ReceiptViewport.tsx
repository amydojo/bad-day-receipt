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
  const hiddenDistance = couponCount > 0 ? 180 : 118
  const couponDistance = Math.min(18, couponCount * 2.2)
  const couponOffset = ['printingCoupons', 'complete'].includes(phase)
    ? couponDistance * couponProgress
    : 0
  const paperOffset = -hiddenDistance * (1 - paperProgress) + couponOffset

  return (
    <div className="receipt-viewport" data-phase={phase}>
      <div className="slot-occlusion" aria-hidden="true" />
      <div
        className="receipt-track receipt-wrap"
        style={{ '--paper-offset': `${paperOffset}px` } as CSSProperties}
      >
        {children}
      </div>
      <PrintHeadBand phase={phase} />
    </div>
  )
}
