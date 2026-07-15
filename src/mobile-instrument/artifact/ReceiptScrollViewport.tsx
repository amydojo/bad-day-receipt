import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { calculateReceiptProgress, ReceiptProgress } from './ReceiptProgress'

export function ReceiptScrollViewport({
  children,
  resetKey,
}: {
  children: ReactNode
  resetKey: string
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState({ visible: false, percent: 100 })

  const measure = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    setProgress(calculateReceiptProgress(
      viewport.scrollTop,
      viewport.scrollHeight,
      viewport.clientHeight,
    ))
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    viewport.scrollTop = 0
    measure()

    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measure)
    observer?.observe(viewport)
    const receipt = viewport.firstElementChild
    if (receipt instanceof HTMLElement) observer?.observe(receipt)

    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, resetKey])

  return (
    <div className="evidence-viewer__reader">
      <div
        ref={viewportRef}
        className="evidence-viewer__scroll"
        role="region"
        aria-label="Completed receipt. Scroll to read all evidence."
        tabIndex={0}
        onScroll={measure}
        data-scroll-owner="receipt"
      >
        {children}
      </div>
      <ReceiptProgress {...progress} />
    </div>
  )
}
