import { useEffect, type Ref } from 'react'
import { getRecoveryCopy } from './recoveryCopy'
import type { CarryCheckpointRecovery } from './recoveryPersistence'
import { emitReceiptEndingRecoveryEvent } from './receiptEndingRecovery'

export function ReceiptEndingRecovery({
  recovery,
  headingRef,
  onRestart,
  onDismiss,
}: {
  recovery: Extract<CarryCheckpointRecovery, { status: 'recoverable' }>
  headingRef: Ref<HTMLHeadingElement>
  onRestart: () => void
  onDismiss: () => void
}) {
  const copy = getRecoveryCopy(recovery.copyId)

  useEffect(() => {
    emitReceiptEndingRecoveryEvent({
      event: {
        domain: 'carry',
        boundary: recovery.boundary,
        outcome: 'presented',
      },
    })
  }, [recovery.boundary])

  return (
    <section
      className="receipt-ending-recovery receipt-decision"
      data-carry-checkpoint-recovery={recovery.checkpoint.phase}
      aria-labelledby="receipt-ending-recovery-heading"
    >
      <p className="receipt-decision__eyebrow">{copy.eyebrow}</p>
      <h2 id="receipt-ending-recovery-heading" ref={headingRef} tabIndex={-1}>
        {copy.title}
      </h2>
      <p className="receipt-decision__body">{copy.body}</p>
      <p className="receipt-ending-recovery__boundary">
        RECOVERED BOUNDARY · {recovery.boundary.replaceAll('-', ' ').toUpperCase()}
      </p>
      <div className="receipt-decision__choices">
        <button
          className="receipt-decision__choice"
          type="button"
          onClick={() => {
            emitReceiptEndingRecoveryEvent({
              event: { domain: 'carry', boundary: recovery.boundary, outcome: 'retry' },
            })
            onRestart()
          }}
        >
          <span className="receipt-decision__choice-label">START CARRY FORWARD AGAIN</span>
          <span className="receipt-decision__choice-description">
            Designate the unfinished thing again. Private task text was not restored.
          </span>
        </button>
        <button
          className="receipt-decision__choice"
          type="button"
          onClick={() => {
            emitReceiptEndingRecoveryEvent({
              event: { domain: 'carry', boundary: recovery.boundary, outcome: 'dismissed' },
            })
            onDismiss()
          }}
        >
          <span className="receipt-decision__choice-label">RETURN TO COMPLETED RECEIPT</span>
          <span className="receipt-decision__choice-description">
            Clear the mechanical checkpoint and leave the completed record unchanged.
          </span>
        </button>
      </div>
    </section>
  )
}
