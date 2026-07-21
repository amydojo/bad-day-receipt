import type { CSSProperties, ReactNode } from 'react'
import type { PrinterPhase } from '../printer/printerTypes'
import type {
  KeepRitualPhase,
  ReleaseRitualPhase,
} from '../receipt-ending/receiptEndingTypes'
import { PrintHeadBand } from './PrintHeadBand'

interface ReceiptViewportProps {
  children: ReactNode
  materialLayer?: ReactNode
  overlayLayer?: ReactNode
  paperProgress: number
  couponProgress: number
  phase: PrinterPhase
  couponCount: number
  keepPhase?: KeepRitualPhase
  releasePhase?: ReleaseRitualPhase
}

export function ReceiptViewport({
  children,
  materialLayer,
  overlayLayer,
  paperProgress,
  couponProgress,
  phase,
  couponCount,
  keepPhase,
  releasePhase,
}: ReceiptViewportProps) {
  const hiddenDistance = couponCount > 0 ? 230 : 190
  const couponDistance = Math.min(28, couponCount * 3.2)
  const couponOffset = ['printingCoupons', 'complete'].includes(phase)
    ? couponDistance * couponProgress
    : 0
  const paperOffset = -hiddenDistance * (1 - paperProgress) + couponOffset

  return (
    <div
      className="receipt-viewport"
      data-phase={phase}
      data-keep-phase={keepPhase}
      data-release-phase={releasePhase}
    >
      <div className="machine-under-shadow" aria-hidden="true" />
      <div className="paper-contact-shadow" aria-hidden="true" />
      <div className="paper-pressure-shadow" aria-hidden="true" />
      <div
        className="receipt-track receipt-wrap"
        style={{ '--paper-offset': `${paperOffset}px` } as CSSProperties}
      >
        <div className="receipt-paper-neck">
          <div
            className="receipt-material-stack"
            data-keep-phase={keepPhase}
            data-release-phase={releasePhase}
          >
            <div
              className="receipt-material-stack__sleeve"
              style={{ position: 'absolute', inset: 0, zIndex: 1 }}
              aria-hidden="true"
            >
              {materialLayer}
            </div>
            {children}
            <div
              className="receipt-material-stack__overlay"
              style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
              aria-hidden="true"
            >
              {overlayLayer}
            </div>
          </div>
        </div>
      </div>
      <PrintHeadBand phase={phase} />
    </div>
  )
}
