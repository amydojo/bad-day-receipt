import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type Ref,
} from 'react'
import type { MachineSensoryDirector } from '../../mobile-instrument/sensory/sensoryTypes'
import type { CompletedReceiptSnapshot } from '../completedReceipt'
import { getRecoveryCopy } from '../recovery/recoveryCopy'
import type {
  ReceiptEndingEvent,
  ReceiptEndingState,
  ReleaseFailure,
  ReleaseOrigin,
} from '../receiptEndingTypes'
import { createReleaseUndoUntil } from './releasePersistence'
import { getReleasePhaseAdvance } from './releaseRitualMotion'
import { emitReleaseRitualMilestone } from './releaseRitualSensory'

export type ReleaseCommitResult =
  | { status: 'saved' }
  | { status: 'unavailable' }
  | { status: 'failed'; reason?: ReleaseFailure }

export type UndoReleaseResult =
  | { status: 'saved'; destination: 'documented' | 'archive' }
  | { status: 'unavailable' }
  | { status: 'failed'; reason?: ReleaseFailure }

export function ReleaseReceiptRitual({
  state,
  dispatch,
  headingRef,
  reducedMotion,
  sensory,
  onCommitRelease,
  onUndoRelease,
  onExpireRelease,
  onExportLocalCopy,
  onReturnToSource,
}: {
  state: Extract<ReceiptEndingState, { kind: 'release-ritual' | 'release-recovery' }>
  dispatch: Dispatch<ReceiptEndingEvent>
  headingRef: Ref<HTMLHeadingElement>
  reducedMotion: boolean
  sensory: MachineSensoryDirector
  onCommitRelease: (
    receipt: CompletedReceiptSnapshot,
    origin: ReleaseOrigin,
    undoUntil: string,
  ) => Promise<ReleaseCommitResult> | ReleaseCommitResult
  onUndoRelease: () => Promise<UndoReleaseResult> | UndoReleaseResult
  onExpireRelease: () => Promise<ReleaseCommitResult> | ReleaseCommitResult
  onExportLocalCopy: (receipt: CompletedReceiptSnapshot) => Promise<boolean>
  onReturnToSource: (origin: ReleaseOrigin) => void
}) {
  const commitPromises = useRef(new Map<string, Promise<ReleaseCommitResult>>())
  const undoPromises = useRef(new Map<string, Promise<UndoReleaseResult>>())
  const expiryPromises = useRef(new Map<string, Promise<ReleaseCommitResult>>())
  const emittedMilestones = useRef(new Set<string>())
  const [exportMessage, setExportMessage] = useState('')
  const [exportBusy, setExportBusy] = useState(false)

  useEffect(() => {
    if (state.kind !== 'release-ritual') return
    const advance = getReleasePhaseAdvance(state.phase, reducedMotion)
    if (!advance) return

    const timeout = window.setTimeout(() => dispatch(advance.event), advance.delay)
    return () => window.clearTimeout(timeout)
  }, [dispatch, reducedMotion, state])

  useEffect(() => {
    if (state.kind !== 'release-ritual') return
    emitReleaseRitualMilestone({
      sensory,
      receiptNumber: state.receipt.receiptNumber,
      phase: state.phase,
      emitted: emittedMilestones.current,
    })
  }, [sensory, state])

  useEffect(() => {
    if (state.kind !== 'release-ritual'
      || state.phase !== 'committing'
      || !state.undoUntil) return

    const key = [state.receipt.receiptNumber, state.releaseAttempt, state.undoUntil, state.origin.kind].join(':')
    let promise = commitPromises.current.get(key)
    if (!promise) {
      promise = Promise.resolve(onCommitRelease(state.receipt, state.origin, state.undoUntil))
      commitPromises.current.set(key, promise)
    }

    let canceled = false
    void promise
      .then((result) => {
        if (canceled) return
        if (result.status === 'saved') {
          dispatch({ type: 'RELEASE_COMMITTED' })
          return
        }
        dispatch({
          type: 'RELEASE_FAILED',
          reason: result.status === 'unavailable'
            ? 'storage-unavailable'
            : result.reason ?? 'storage-write-failed',
        })
      })
      .catch(() => {
        if (!canceled) dispatch({ type: 'RELEASE_FAILED', reason: 'storage-write-failed' })
      })

    return () => {
      canceled = true
    }
  }, [dispatch, onCommitRelease, state])

  useEffect(() => {
    if (state.kind !== 'release-ritual' || state.phase !== 'undoing' || !state.undoUntil) return

    const key = `${state.receipt.receiptNumber}:${state.undoUntil}`
    let promise = undoPromises.current.get(key)
    if (!promise) {
      promise = Promise.resolve(onUndoRelease())
      undoPromises.current.set(key, promise)
    }

    let canceled = false
    void promise
      .then((result) => {
        if (canceled) return
        if (result.status === 'saved') {
          dispatch({ type: 'UNDO_RELEASE_COMMITTED', destination: result.destination })
          return
        }
        dispatch({
          type: 'UNDO_RELEASE_FAILED',
          reason: result.status === 'unavailable'
            ? 'storage-unavailable'
            : result.reason ?? 'storage-write-failed',
        })
      })
      .catch(() => {
        if (!canceled) dispatch({ type: 'UNDO_RELEASE_FAILED', reason: 'storage-write-failed' })
      })

    return () => {
      canceled = true
    }
  }, [dispatch, onUndoRelease, state])

  useEffect(() => {
    if (state.kind !== 'release-ritual' || state.phase !== 'complete' || !state.undoUntil) return

    let canceled = false
    let timeout: number | null = null
    const deadline = new Date(state.undoUntil).getTime()

    const expire = () => {
      if (canceled) return
      const key = `${state.receipt.receiptNumber}:${state.undoUntil}:expiry`
      let promise = expiryPromises.current.get(key)
      if (!promise) {
        promise = Promise.resolve(onExpireRelease())
        expiryPromises.current.set(key, promise)
      }

      void promise
        .then((result) => {
          if (canceled) return
          if (result.status === 'saved') {
            dispatch({ type: 'RELEASE_UNDO_EXPIRED' })
            return
          }
          dispatch({
            type: 'RELEASE_EXPIRY_FAILED',
            reason: result.status === 'unavailable'
              ? 'storage-unavailable'
              : result.reason ?? 'storage-write-failed',
          })
        })
        .catch(() => {
          if (!canceled) dispatch({ type: 'RELEASE_EXPIRY_FAILED', reason: 'storage-write-failed' })
        })
    }

    const reconcileDeadline = () => {
      if (Date.now() >= deadline) expire()
    }

    const remaining = deadline - Date.now()
    if (remaining <= 0) expire()
    else timeout = window.setTimeout(expire, remaining)

    document.addEventListener('visibilitychange', reconcileDeadline)
    window.addEventListener('pageshow', reconcileDeadline)

    return () => {
      canceled = true
      if (timeout !== null) window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', reconcileDeadline)
      window.removeEventListener('pageshow', reconcileDeadline)
    }
  }, [dispatch, onExpireRelease, state])

  if (state.kind === 'release-recovery') {
    const undoRecovery = state.operation === 'undo'
    const expiryRecovery = state.operation === 'expiry'
    const copy = getRecoveryCopy(
      expiryRecovery
        ? 'release-expiry'
        : undoRecovery
          ? 'release-undo'
          : 'release-storage',
    )
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
        className="release-recovery receipt-decision"
        data-release-recovery={state.reason}
        data-release-recovery-operation={state.operation}
        aria-labelledby="release-recovery-heading"
      >
        <p className="receipt-decision__eyebrow">{copy.eyebrow}</p>
        <h2 id="release-recovery-heading" ref={headingRef} tabIndex={-1}>
          {copy.title}
        </h2>
        <p className="receipt-decision__body">{copy.body}</p>
        <div className="receipt-decision__choices release-recovery__choices">
          <button
            className="receipt-decision__choice"
            type="button"
            onClick={() => dispatch(expiryRecovery
              ? { type: 'RETRY_RELEASE_EXPIRY' }
              : undoRecovery
                ? { type: 'RETRY_UNDO_RELEASE' }
                : { type: 'RETRY_RELEASE', undoUntil: createReleaseUndoUntil() })}
          >
            <span className="receipt-decision__choice-label">
              {expiryRecovery
                ? 'TRY FINALIZATION AGAIN'
                : undoRecovery
                  ? 'TRY UNDO AGAIN'
                  : 'TRY RELEASE AGAIN'}
            </span>
            <span className="receipt-decision__choice-description">
              {expiryRecovery
                ? 'Confirm the expired local release without removing anything again.'
                : undoRecovery
                  ? 'Attempt to restore the exact local receipt once more.'
                  : 'Attempt the local release once more.'}
            </span>
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
          {!expiryRecovery && (
            <button
              className="receipt-decision__choice"
              type="button"
              onClick={() => {
                if (undoRecovery) dispatch({ type: 'RETURN_TO_RELEASED_COMPLETION' })
                else onReturnToSource(state.origin)
              }}
            >
              <span className="receipt-decision__choice-label">
                {undoRecovery ? 'RETURN TO RELEASED RECEIPT' : 'RETURN TO THE DOCUMENTED RECEIPT'}
              </span>
              <span className="receipt-decision__choice-description">
                {undoRecovery
                  ? 'Keep the released completion and its remaining Undo action.'
                  : 'Leave the release without changing the receipt.'}
              </span>
            </button>
          )}
        </div>
        <p className="release-recovery__status" aria-live="polite">{exportMessage}</p>
      </section>
    )
  }

  if (state.phase === 'complete' || state.phase === 'undoing') {
    const undoExpired = Boolean(
      state.undoUntil && new Date(state.undoUntil).getTime() <= Date.now(),
    )
    return (
      <section
        className="release-completion receipt-decision"
        data-release-completion
        aria-labelledby="release-completion-heading"
      >
        <p className="receipt-decision__eyebrow">RECORD CLOSED</p>
        <h2 id="release-completion-heading" ref={headingRef} tabIndex={-1}>
          The day can end here.
        </h2>
        <p className="receipt-decision__body">Nothing has been added to tomorrow.</p>
        <button
          className="receipt-decision__back"
          type="button"
          disabled={state.phase === 'undoing' || undoExpired}
          onClick={() => dispatch({ type: 'UNDO_RELEASE' })}
        >
          {state.phase === 'undoing'
            ? 'RESTORING RECEIPT…'
            : undoExpired
              ? 'FINALIZING RELEASE…'
              : 'UNDO RELEASE'}
        </button>
      </section>
    )
  }

  return (
    <section
      className="release-ritual"
      data-release-ritual
      data-release-phase={state.phase}
      aria-busy="true"
      aria-label="Releasing the receipt"
    >
      <p className="release-ritual__status" aria-hidden="true">RELEASING THE RECORD</p>
      <p className="sr-only" aria-live="polite">Releasing the receipt.</p>
    </section>
  )
}
