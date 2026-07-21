import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type Ref,
} from 'react'
import { CarryForwardDesignation } from '../carry-forward/designation/CarryForwardDesignation'
import { getDevelopmentDesignationInputs } from '../carry-forward/designation/designationFixtures'
import { CarryForwardRuntimeHost } from '../carry-forward/integration/CarryForwardRuntimeHost'
import {
  loadCarryForwardSession,
  type StoredCarryForwardFallback,
  type StoredCarryForwardSession,
} from '../carry-forward/carryForwardStorage'
import type { MachineSensoryDirector } from '../mobile-instrument/sensory/sensoryTypes'
import type { CompletedReceiptSnapshot } from './completedReceipt'
import { EndDispositionChoice } from './EndDispositionChoice'
import {
  KeepReceiptRitual,
  type KeepArchiveCommitResult,
} from './keep/KeepReceiptRitual'
import {
  ReleaseReceiptRitual,
  type ReleaseCommitResult,
  type UndoReleaseResult,
} from './release/ReleaseReceiptRitual'
import { ReceiptDecisionSurface } from './ReceiptDecisionSurface'
import { RECEIPT_COMPLETION_PAUSE_MS } from './receiptEndingEffects'
import type {
  ReceiptEndingEvent,
  ReceiptEndingPersistenceStatus,
  ReceiptEndingState,
  ReleaseOrigin,
} from './receiptEndingTypes'

const DOCUMENTED_ANNOUNCEMENT = 'The day is documented. Choose whether to end here or carry one thing forward.'

export function ReceiptEndingExperience({
  state,
  dispatch,
  headingRef,
  persistenceStatus,
  reducedMotion,
  sensory,
  onCommitKeepArchive,
  onCommitRelease,
  onUndoRelease,
  onExpireRelease,
  onExportLocalCopy,
  onReturnFromRelease,
  onCloseKeepCompletion,
}: {
  state: ReceiptEndingState
  dispatch: Dispatch<ReceiptEndingEvent>
  headingRef?: Ref<HTMLElement>
  persistenceStatus: ReceiptEndingPersistenceStatus
  reducedMotion: boolean
  sensory: MachineSensoryDirector
  onCommitKeepArchive: (
    receipt: CompletedReceiptSnapshot,
    archivedAt: string,
  ) => Promise<KeepArchiveCommitResult> | KeepArchiveCommitResult
  onCommitRelease: (
    receipt: CompletedReceiptSnapshot,
    origin: ReleaseOrigin,
    undoUntil: string,
  ) => Promise<ReleaseCommitResult> | ReleaseCommitResult
  onUndoRelease: () => Promise<UndoReleaseResult> | UndoReleaseResult
  onExpireRelease: () => Promise<ReleaseCommitResult> | ReleaseCommitResult
  onExportLocalCopy: (receipt: CompletedReceiptSnapshot) => Promise<boolean>
  onReturnFromRelease: (origin: ReleaseOrigin) => void
  onCloseKeepCompletion: () => void
}) {
  const localHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const [restoredRuntime, setRestoredRuntime] = useState<StoredCarryForwardSession | StoredCarryForwardFallback | null>(null)

  useEffect(() => {
    if (state.kind !== 'settling') return

    const timeout = window.setTimeout(() => {
      dispatch({ type: 'PRINT_COMPLETION_SETTLED' })
    }, RECEIPT_COMPLETION_PAUSE_MS)

    return () => window.clearTimeout(timeout)
  }, [dispatch, state.kind, state.receipt.receiptNumber])

  useEffect(() => {
    const stored = loadCarryForwardSession(window.localStorage)
    if (stored.status !== 'ready') {
      setRestoredRuntime(null)
      return
    }
    if (stored.value.budget.receiptId !== state.receipt.receiptNumber) {
      setRestoredRuntime(null)
      return
    }
    setRestoredRuntime(stored.value)
  }, [state.receipt.receiptNumber])

  const focusToken = restoredRuntime ? null : getFocusToken(state)
  useEffect(() => {
    if (!focusToken) return
    const frame = window.requestAnimationFrame(() => {
      localHeadingRef.current?.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [focusToken, state.receipt.receiptNumber])

  const assignHeadingRef = (node: HTMLHeadingElement | null) => {
    localHeadingRef.current = node
    if (typeof headingRef === 'function') {
      headingRef(node)
    } else if (headingRef) {
      headingRef.current = node
    }
  }

  const persistenceNote = persistenceStatus === 'saved'
    ? null
    : 'This receipt remains available for this session. Local recovery is not currently confirmed.'

  if (state.kind === 'settling') {
    return (
      <div
        className="receipt-ending-experience receipt-ending-experience--settling"
        data-receipt-ending-state="settling"
        aria-hidden="true"
      />
    )
  }

  let surface: ReactNode

  if (restoredRuntime) {
    surface = (
      <CarryForwardRuntimeHost
        restored={restoredRuntime}
        onReturnToReceipt={() => {
          setRestoredRuntime(null)
          dispatch({ type: 'BACK_TO_DOCUMENTED' })
        }}
      />
    )
  } else switch (state.kind) {
    case 'documented':
      surface = (
        <ReceiptDecisionSurface
          eyebrow="RECORD COMPLETE"
          title="The day is documented."
          body="Your receipt is complete. You may leave everything here, or carry one unfinished thing under different conditions."
          headingRef={assignHeadingRef}
          persistenceNote={persistenceNote}
          choices={[
            {
              id: 'end-here',
              label: 'END THE DAY HERE',
              description: 'Nothing else will be asked of you.',
              onSelect: () => dispatch({ type: 'SELECT_END_HERE' }),
            },
            {
              id: 'carry-forward',
              label: 'CARRY ONE THING FORWARD',
              description: 'Choose one remaining obligation and make it smaller.',
              onSelect: () => dispatch({ type: 'SELECT_CARRY_FORWARD' }),
            },
          ]}
        />
      )
      break

    case 'end-choice':
      surface = (
        <EndDispositionChoice
          headingRef={assignHeadingRef}
          persistenceNote={persistenceNote}
          onKeep={() => dispatch({ type: 'SELECT_KEEP' })}
          onRelease={() => dispatch({ type: 'SELECT_RELEASE' })}
          onBack={() => dispatch({ type: 'BACK_TO_DOCUMENTED' })}
        />
      )
      break

    case 'keep-ritual':
    case 'keep-recovery':
      surface = (
        <KeepReceiptRitual
          state={state}
          dispatch={dispatch}
          headingRef={assignHeadingRef}
          reducedMotion={reducedMotion}
          sensory={sensory}
          onCommitArchive={onCommitKeepArchive}
          onExportLocalCopy={onExportLocalCopy}
          onClose={onCloseKeepCompletion}
        />
      )
      break

    case 'release-ritual':
    case 'release-recovery':
      surface = (
        <ReleaseReceiptRitual
          state={state}
          dispatch={dispatch}
          headingRef={assignHeadingRef}
          reducedMotion={reducedMotion}
          sensory={sensory}
          onCommitRelease={onCommitRelease}
          onUndoRelease={onUndoRelease}
          onExpireRelease={onExpireRelease}
          onExportLocalCopy={onExportLocalCopy}
          onReturnToSource={onReturnFromRelease}
        />
      )
      break

    case 'carry-selected':
      surface = (
        <CarryForwardDesignation
          origin={{
            kind: 'receipt',
            receiptId: state.receipt.receiptNumber,
            explicitInputs: getDevelopmentDesignationInputs(),
          }}
          reducedMotion={reducedMotion}
          sensory={sensory}
          onNothingAfterAll={() => dispatch({ type: 'BACK_TO_DOCUMENTED' })}
        />
      )
      break

    case 'recovery':
      surface = (
        <ReceiptEndingHandoff
          eyebrow="RECEIPT STILL VALID"
          title="The ending choice needs a reset."
          body="The completed receipt has not been changed."
          headingRef={assignHeadingRef}
          backLabel="RETURN TO THE DOCUMENTED RECEIPT"
          onBack={() => dispatch({ type: 'RECOVER' })}
        />
      )
      break
  }

  return (
    <div
      className="receipt-ending-experience"
      data-receipt-ending-state={restoredRuntime ? 'carry-runtime-restored' : state.kind}
      data-keep-phase={state.kind === 'keep-ritual' ? state.phase : undefined}
      data-release-phase={state.kind === 'release-ritual' ? state.phase : undefined}
    >
      {surface}
      {!restoredRuntime && state.kind === 'documented' && (
        <p className="sr-only" aria-live="polite">
          {DOCUMENTED_ANNOUNCEMENT}
        </p>
      )}
    </div>
  )
}

function getFocusToken(state: ReceiptEndingState): string | null {
  if (state.kind === 'settling' || state.kind === 'carry-selected') return null
  if (state.kind === 'keep-ritual') {
    return state.phase === 'complete' ? 'keep-complete' : null
  }
  if (state.kind === 'release-ritual') {
    return state.phase === 'complete' || state.phase === 'undoing'
      ? 'release-complete'
      : null
  }
  return state.kind
}

function ReceiptEndingHandoff({
  eyebrow,
  title,
  body,
  headingRef,
  onBack,
  backLabel = 'BACK',
}: {
  eyebrow: string
  title: string
  body: string
  headingRef: Ref<HTMLHeadingElement>
  onBack: () => void
  backLabel?: string
}) {
  return (
    <section
      className="receipt-decision receipt-decision--handoff"
      data-next-ritual-slot="recovery"
      aria-labelledby="receipt-ending-recovery-heading"
    >
      <p className="receipt-decision__eyebrow">{eyebrow}</p>
      <h2
        id="receipt-ending-recovery-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        {title}
      </h2>
      <p className="receipt-decision__body">{body}</p>
      <div className="receipt-decision__reserved" aria-hidden="true" />
      <button
        className="receipt-decision__back"
        type="button"
        onClick={onBack}
      >
        {backLabel}
      </button>
    </section>
  )
}
