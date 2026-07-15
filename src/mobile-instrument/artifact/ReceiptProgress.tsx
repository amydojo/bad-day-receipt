import type { CSSProperties } from 'react'

interface ReceiptProgressState {
  visible: boolean
  percent: number
}

export function calculateReceiptProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  overflowThreshold = 48,
): ReceiptProgressState {
  const scrollableDistance = Math.max(0, scrollHeight - clientHeight)
  if (scrollableDistance <= overflowThreshold) {
    return { visible: false, percent: 100 }
  }

  const boundedTop = Math.max(0, Math.min(scrollTop, scrollableDistance))
  return {
    visible: true,
    percent: Math.round((boundedTop / scrollableDistance) * 100),
  }
}

export function ReceiptProgress({
  visible,
  percent,
}: ReceiptProgressState) {
  if (!visible) return null

  return (
    <div className="evidence-progress" aria-hidden="true">
      <span>RECEIPT LENGTH</span>
      <strong>{percent}%</strong>
      <i style={{ '--evidence-progress': `${percent}%` } as CSSProperties} />
    </div>
  )
}
