import { type ReactNode, type Ref } from 'react'
import { PinnedPrinterHead } from './PinnedPrinterHead'
import { ReceiptScrollViewport } from './ReceiptScrollViewport'

export function EvidenceViewer({
  paperName,
  receiptNumber,
  headingRef,
  printerHead,
  receipt,
  actions,
}: {
  paperName: string
  receiptNumber: string
  headingRef: Ref<HTMLElement>
  printerHead: ReactNode
  receipt: ReactNode
  actions: ReactNode
}) {
  return (
    <section
      className="evidence-viewer"
      aria-labelledby="evidence-viewer-heading"
      data-evidence-viewer="true"
    >
      <PinnedPrinterHead ref={headingRef} paperName={paperName}>
        {printerHead}
      </PinnedPrinterHead>

      <ReceiptScrollViewport resetKey={receiptNumber}>
        {receipt}
      </ReceiptScrollViewport>

      <footer className="evidence-viewer__dock">
        {actions}
      </footer>
    </section>
  )
}
