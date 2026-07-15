import { forwardRef, type ReactNode } from 'react'

export const PinnedPrinterHead = forwardRef<HTMLElement, {
  paperName: string
  children: ReactNode
}>(function PinnedPrinterHead({ paperName, children }, ref) {
  return (
    <header className="evidence-viewer__head">
      <div className="evidence-viewer__identity">
        <span>SM–001 · EVIDENCE READER</span>
        <h2 id="evidence-viewer-heading" ref={ref} tabIndex={-1}>Receipt complete</h2>
        <strong>{paperName} · RECORDED</strong>
      </div>
      <div className="evidence-viewer__printer" aria-hidden="true">
        {children}
      </div>
    </header>
  )
})
