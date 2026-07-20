import type { Ref } from 'react'
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
  return (
    <section
      className="receipt-ending-foundation"
      data-receipt-ending-state={state.kind}
      aria-labelledby="receipt-ending-foundation-heading"
    >
      <span>RECEIPT ENDING · FOUNDATION</span>
      <h2
        id="receipt-ending-foundation-heading"
        ref={headingRef as Ref<HTMLHeadingElement>}
        tabIndex={-1}
        autoFocus
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
