import {
  useEffect,
  useRef,
  type Ref,
} from 'react'
import type {
  ReceiptEndingPersistenceStatus,
  ReceiptEndingState,
} from './receiptEndingTypes'

export function ReceiptEndingBoundary({
  state,
  headingRef,
  persistenceStatus,
}: {
  state: ReceiptEndingState
  headingRef?: Ref<HTMLElement>
  persistenceStatus: ReceiptEndingPersistenceStatus
}) {
  const localHeadingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      localHeadingRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [state.kind, state.receipt.receiptNumber])

  const assignHeadingRef = (node: HTMLHeadingElement | null) => {
    localHeadingRef.current = node
    if (typeof headingRef === 'function') {
      headingRef(node)
    } else if (headingRef) {
      headingRef.current = node
    }
  }

  return (
    <section
      className="receipt-ending-foundation"
      data-receipt-ending-state={state.kind}
      aria-labelledby="receipt-ending-foundation-heading"
    >
      <span>RECEIPT ENDING · FOUNDATION</span>
      <h2
        id="receipt-ending-foundation-heading"
        ref={assignHeadingRef}
        tabIndex={-1}
      >
        The day is documented.
      </h2>
      <p>
        Your completed receipt is waiting for an ending choice.
      </p>
      {persistenceStatus !== 'saved' && (
        <p className="receipt-ending-foundation__storage" role="status">
          This receipt is available for this session. Local recovery is not currently confirmed.
        </p>
      )}
    </section>
  )
}
