import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type Ref,
} from 'react'
import type { MachineSensoryDirector } from '../../mobile-instrument/sensory/sensoryTypes'
import type { CompletedReceiptSnapshot } from '../completedReceipt'
import type {
  KeepArchiveFailure,
  ReceiptEndingEvent,
  ReceiptEndingState,
} from '../receiptEndingTypes'
import { getKeepPhaseAdvance } from './keepRitualMotion'
import { emitKeepRitualMilestone } from './keepRitualSensory'

export type KeepArchiveCommitResult =
  | { status: 'saved' }
  | { status: 'unavailable' }
  | { status: 'failed'; reason?: KeepArchiveFailure }

export function KeepReceiptRitual({
  state,
  dispatch,
  headingRef,
  reducedMotion,
  sensory,
  onCommitArchive,
  onExportLocalCopy,
  onClose,
}: {
  state: Extract<ReceiptEndingState, { kind: 'keep-ritual' | 'keep-recovery' }>
  dispatch: Dispatch<ReceiptEndingEvent>
  headingRef: Ref<HTMLHeadingElement>
  reducedMotion: boolean
  sensory: MachineSensoryDirector
  onCommitArchive: (
    receipt: CompletedReceiptSnapshot,
    archivedAt: string,
  ) => Promise<KeepArchiveCommitResult> | KeepArchiveCommitResult
  onExportLocalCopy: (receipt: CompletedReceiptSnapshot) => Promise<boolean>
  onClose: () => void
}) {
  const committedAttempts = useRef(new Set<string>())
  const emittedMilestones = useRef(new Set<string>())
  const [exportMessage, setExportMessage] = useState('')
  const [exportBusy, setExportBusy] = useState(false)

  useEffect(() => {
    if (state.kind !== 'keep-ritual') return
    if (state.phase === 'complete') return
    if (state.phase === 'archive-closing' && state.archivedAt) return

    const advance = getKeepPhaseAdvance(state.phase, reducedMotion)
    if (!advance) return

    const timeout = window.setTimeout(() => {
      dispatch(advance.event)
    }, advance.delay)

    return () => window.clearTimeout(timeout)
  }, [dispatch, reducedMotion, state])

  useEffect(() => {
    if (state.kind !== 'keep-ritual') return
    emitKeepRitualMilestone({
      sensory,
      receiptNumber: state.receipt.receiptNumber,
      phase: state.phase,
      emitted: emittedMilestones.current,
    })
  }, [sensory, state])

  useEffect(() => {
    if (state.kind !== 'keep-ritual') return
    if (state.phase !== 'archive-closing' || !state.archivedAt) return

    const attemptKey = [
      state.receipt.receiptNumber,
      state.archiveAttempt,
      state.archivedAt,
    ].join(':')
    if (committedAttempts.current.has(attemptKey)) return
    committedAttempts.current.add(attemptKey)

    let canceled = false
    void Promise.resolve(onCommitArchive(state.receipt, state.archivedAt))
      .then((result) => {
        if (canceled) return
        if (result.status === 'saved') {
          dispatch({ type: 'KEEP_ARCHIVE_COMMITTED' })
          return
        }
        dispatch({
          type: 'KEEP_ARCHIVE_FAILED',
          reason: result.status === 'unavailable'
            ? 'storage-unavailable'
            : result.reason ?? 'storage-write-failed',
        })
      })
      .catch(() => {
        if (!canceled) {
          dispatch({
            type: 'KEEP_ARCHIVE_FAILED',
            reason: 'storage-write-failed',
          })
        }
      })

    return () => {
      canceled = true
    }
  }, [dispatch, onCommitArchive, state])

  if (state.kind === 'keep-recovery') {
    const exportCopy = async () => {
      if (exportBusy) return
      setExportBusy(true)
      setExportMessage('PREPARING LOCAL COPY…')
      const saved = await onExportLocalCopy(state.receipt).catch(() => false)
      setExportMessage(saved
        ? 'LOCAL COPY SAVED'
        : 'THE RECEIPT IS STILL HERE · EXPORT WAS NOT COMPLETED')
      setExportBusy(false)
    }

    return (
      <section
        className="keep-recovery receipt-decision"
        data-keep-recovery={state.reason}
        aria-labelledby="keep-recovery-heading"
      >
        <p className="receipt-decision__eyebrow">RECEIPT STILL VALID</p>
        <h2 id="keep-recovery-heading" ref={headingRef} tabIndex={-1}>
          The receipt is still here.
        </h2>
        <p className="receipt-decision__body">
          The private archive could not be confirmed on this device. Nothing has been lost.
        </p>
        <div className="receipt-decision__choices keep-recovery__choices">
          <button
            className="receipt-decision__choice"
            type="button"
            onClick={() => dispatch({
              type: 'RETRY_KEEP_ARCHIVE',
              archivedAt: new Date().toISOString(),
            })}
          >
            <span className="receipt-decision__choice-label">TRY PRIVATE ARCHIVE AGAIN</span>
            <span className="receipt-decision__choice-description">Attempt the local archive once more.</span>
          </button>
          <button
            className="receipt-decision__choice"
            type="button"
            disabled={exportBusy}
            onClick={() => { void exportCopy() }}
          >
            <span className="receipt-decision__choice-label">EXPORT A LOCAL COPY</span>
            <span className="receipt-decision__choice-description">Save the receipt directly to this device.</span>
          </button>
          <button
            className="receipt-decision__choice"
            type="button"
            onClick={() => dispatch({ type: 'RETURN_TO_DOCUMENTED' })}
          >
            <span className="receipt-decision__choice-label">RETURN TO THE DOCUMENTED RECEIPT</span>
            <span className="receipt-decision__choice-description">Leave the archive without changing the receipt.</span>
          </button>
        </div>
        <p className="keep-recovery__status" aria-live="polite">{exportMessage}</p>
      </section>
    )
  }

  if (state.phase === 'complete') {
    return (
      <section
        className="keep-completion receipt-decision"
        data-keep-completion
        aria-labelledby="keep-completion-heading"
      >
        <p className="receipt-decision__eyebrow">PRIVATE ARCHIVE</p>
        <h2 id="keep-completion-heading" ref={headingRef} tabIndex={-1}>
          Receipt kept with care.
        </h2>
        <p className="receipt-decision__body">
          This happened. It was worth recording. Receipt {state.receipt.receiptNumber} is stored privately.
        </p>
        <div className="keep-completion__stillness" aria-hidden="true" />
        <button
          className="receipt-decision__back"
          type="button"
          onClick={onClose}
        >
          CLOSE
        </button>
      </section>
    )
  }

  return (
    <section
      className="keep-ritual"
      data-keep-ritual
      data-keep-phase={state.phase}
      aria-busy="true"
      aria-label="Preserving the receipt"
    >
      <p className="keep-ritual__status" aria-hidden="true">PRESERVING THE RECORD</p>
      <p className="sr-only" aria-live="polite">
        {state.phase === 'cut' ? 'Preserving the receipt.' : ''}
      </p>
    </section>
  )
}
