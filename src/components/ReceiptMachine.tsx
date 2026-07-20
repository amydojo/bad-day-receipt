import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Dispatch,
} from 'react'
import { getDraftSummary, snapshotDraft } from '../draftReceipt'
import type { ArtifactExport } from '../export/exportTypes'
import { useReceiptPrinter } from '../hooks/useReceiptPrinter'
import { getConciseMachineAnnouncement } from '../machinePresentation'
import { EvidenceViewer } from '../mobile-instrument/artifact/EvidenceViewer'
import { createSensoryDirector } from '../mobile-instrument/sensory/SensoryDirector'
import { getRingButtonLabel } from '../printer/printerMachine'
import type { PrinterPhase } from '../printer/printerTypes'
import {
  createCompletedReceiptSnapshot,
  ReceiptArtifact,
  ReceiptEndingExperience,
  type CompletedReceiptSnapshot,
  type ReceiptEndingEvent,
  type ReceiptEndingPersistenceStatus,
  type ReceiptEndingState,
} from '../receipt-ending'
import { ArchivalSleeve } from '../receipt-ending/keep/ArchivalSleeve'
import type { KeepArchiveCommitResult } from '../receipt-ending/keep/KeepReceiptRitual'
import { getTheme, type ReceiptTheme } from '../themes'
import type { ReceiptItem } from '../types'
import type { ExportFormat } from '../v2'
import { PrinterShell, type PrinterArchiveState } from './PrinterShell'
import { ReceiptViewport } from './ReceiptViewport'
import { RegisterTerminal, shouldRenderIssuedReceipt } from './RegisterTerminal'
import { RingItUpButton } from './RingItUpButton'

export interface ReceiptMachineHandle {
  ringItUp: () => void
  reset: () => void
}

export interface ReceiptMachineStateSnapshot {
  phase: PrinterPhase
  isBusy: boolean
  isComplete: boolean
}

interface ReceiptMachineProps {
  items: ReceiptItem[]
  receiptNumber: string
  theme: ReceiptTheme
  anomaly?: string | null
  shareCopy: string
  soundEnabled: boolean
  hapticsEnabled: boolean
  threeEndingsEnabled: boolean
  receiptEndingState: ReceiptEndingState | null
  receiptEndingPersistenceStatus: ReceiptEndingPersistenceStatus
  onReceiptEndingEvent: Dispatch<ReceiptEndingEvent>
  onSoundChange: (enabled: boolean) => void
  onReceiptNumberChange: (receiptNumber: string) => void
  createExport: (format: ExportFormat) => Promise<ArtifactExport>
  onTransactionComplete: (receiptNumber: string) => void
  onReceiptComplete: (snapshot: CompletedReceiptSnapshot) => void
  onCommitKeepArchive: (
    receipt: CompletedReceiptSnapshot,
    archivedAt: string,
  ) => Promise<KeepArchiveCommitResult> | KeepArchiveCommitResult
  onExportLocalCopy: (receipt: CompletedReceiptSnapshot) => Promise<boolean>
  onCloseKeepCompletion: () => void
  onMakeAnother: () => void
  onClear: () => void
  onStateChange?: (snapshot: ReceiptMachineStateSnapshot) => void
}

export const ReceiptMachine = forwardRef<ReceiptMachineHandle, ReceiptMachineProps>(
  function ReceiptMachine({
    items,
    receiptNumber,
    theme,
    anomaly,
    shareCopy,
    soundEnabled,
    hapticsEnabled,
    threeEndingsEnabled,
    receiptEndingState,
    receiptEndingPersistenceStatus,
    onReceiptEndingEvent,
    onSoundChange,
    onReceiptNumberChange,
    createExport,
    onTransactionComplete,
    onReceiptComplete,
    onCommitKeepArchive,
    onExportLocalCopy,
    onCloseKeepCompletion,
    onMakeAnother,
    onClear,
    onStateChange,
  }, ref) {
    const [committedItems, setCommittedItems] = useState<ReceiptItem[]>(() => snapshotDraft(items))
    const recordedReceipt = useRef<string | null>(null)
    const commitGuard = useRef(false)
    const completionRef = useRef<HTMLElement | null>(null)
    const completionFrame = useRef<number | null>(null)
    const sensory = useMemo(() => createSensoryDirector({
      soundEnabled,
      hapticsEnabled,
    }), [])

    const reducedMotion = usePrefersReducedMotion()
    const couponCount = theme.coupons?.length ?? 0

    useEffect(() => {
      sensory.updatePreferences({ soundEnabled, hapticsEnabled })
    }, [hapticsEnabled, sensory, soundEnabled])

    const {
      state,
      isBusy,
      isComplete,
      startPrinting,
      resetPrinter,
    } = useReceiptPrinter({
      itemCount: items.length,
      couponCount,
      themeId: theme.id,
      reducedMotion,
      onReceiptNumberChange,
      sensory,
    })

    const issuedItems = state.phase === 'idle' ? items : committedItems

    const previousTheme = useRef(theme.id)
    useEffect(() => {
      if (previousTheme.current !== theme.id) {
        previousTheme.current = theme.id
        recordedReceipt.current = null
        commitGuard.current = false
        resetPrinter()
      }
    }, [resetPrinter, theme.id])

    useEffect(() => {
      onStateChange?.({ phase: state.phase, isBusy, isComplete })
    }, [isBusy, isComplete, onStateChange, state.phase])

    useEffect(() => {
      if (!isComplete || !state.receiptNumber) return
      if (recordedReceipt.current === state.receiptNumber) return
      recordedReceipt.current = state.receiptNumber

      if (threeEndingsEnabled) {
        const summary = getDraftSummary(committedItems)
        onReceiptComplete(createCompletedReceiptSnapshot({
          receiptNumber: state.receiptNumber,
          completedAt: new Date().toISOString(),
          theme,
          items: committedItems,
          total: summary.total,
          itemCount: summary.itemCount,
          status: summary.status,
          anomaly: anomaly ?? null,
          shareCopy,
        }))
      } else {
        onTransactionComplete(state.receiptNumber)

        if (completionFrame.current !== null) {
          window.cancelAnimationFrame(completionFrame.current)
        }
        completionFrame.current = window.requestAnimationFrame(() => {
          completionFrame.current = window.requestAnimationFrame(() => {
            completionRef.current?.focus({ preventScroll: true })
            completionFrame.current = null
          })
        })
      }
    }, [
      anomaly,
      committedItems,
      isComplete,
      onReceiptComplete,
      onTransactionComplete,
      shareCopy,
      state.receiptNumber,
      theme,
      threeEndingsEnabled,
    ])

    useEffect(() => () => {
      commitGuard.current = false
      sensory.dispose()
      if (completionFrame.current !== null) window.cancelAnimationFrame(completionFrame.current)
    }, [sensory])

    const endingReceipt = threeEndingsEnabled ? receiptEndingState?.receipt ?? null : null
    const displayTheme = endingReceipt ? getTheme(endingReceipt.themeId) : theme
    const displayItems = endingReceipt?.items ?? issuedItems
    const displayReceiptNumber = endingReceipt?.receiptNumber
      || state.receiptNumber
      || receiptNumber
    const displayAnomaly = endingReceipt?.anomaly ?? anomaly
    const displayShareCopy = endingReceipt?.shareCopy ?? shareCopy
    const displayPhase: PrinterPhase = endingReceipt ? 'complete' : state.phase
    const displayIsComplete = Boolean(endingReceipt) || isComplete
    const displayCouponCount = displayTheme.coupons?.length ?? 0
    const couponProgress = endingReceipt ? 1 : state.couponProgress
    const showVerdict = endingReceipt
      ? true
      : [
          'stamping',
          'falseComplete',
          'printingCoupons',
          'complete',
        ].includes(state.phase)
    const showReceipt = endingReceipt ? true : shouldRenderIssuedReceipt(state.phase)
    const keepPhase = receiptEndingState?.kind === 'keep-ritual'
      ? receiptEndingState.phase
      : undefined
    const keepRecovery = receiptEndingState?.kind === 'keep-recovery'
    const printerPresentation = getPrinterPresentation(receiptEndingState)

    const resetForNew = () => {
      commitGuard.current = false
      recordedReceipt.current = null
      resetPrinter()
    }

    const clear = () => {
      resetForNew()
      onClear()
    }

    const makeAnother = () => {
      resetForNew()
      onMakeAnother()
    }

    const printAgain = () => {
      if (commitGuard.current || isBusy || items.length === 0) return
      commitGuard.current = true
      recordedReceipt.current = null
      setCommittedItems(snapshotDraft(items))
      sensory.prime()
      void startPrinting().finally(() => {
        commitGuard.current = false
      })
    }

    const toggleSound = () => {
      const nextEnabled = !soundEnabled
      sensory.updatePreferences({ soundEnabled: nextEnabled, hapticsEnabled })
      onSoundChange(nextEnabled)
    }

    useImperativeHandle(ref, () => ({
      ringItUp: printAgain,
      reset: resetForNew,
    }))

    const receipt = showReceipt ? (
      <ReceiptViewport
        phase={displayPhase}
        paperProgress={endingReceipt ? 1 : state.paperProgress}
        couponProgress={couponProgress}
        couponCount={displayCouponCount}
        keepPhase={keepPhase}
        materialLayer={(
          <ArchivalSleeve
            phase={keepPhase}
            recovery={keepRecovery}
          />
        )}
      >
        <ReceiptArtifact
          items={displayItems}
          receiptNumber={displayReceiptNumber}
          theme={displayTheme}
          phase={displayPhase}
          visibleLineCount={endingReceipt ? displayItems.length : state.visibleLineCount}
          visibleTotalRows={endingReceipt ? 4 : state.visibleTotalRows}
          showVerdict={showVerdict}
          couponProgress={couponProgress}
          anomaly={displayAnomaly}
          printedAt={endingReceipt?.completedAt}
          endingState={receiptEndingState?.kind}
          keepPhase={keepPhase}
        />
      </ReceiptViewport>
    ) : null

    const appliance = (
      <div className="pos-appliance">
        <RegisterTerminal items={displayItems} theme={displayTheme} phase={displayPhase} />
        <PrinterShell
          phase={displayPhase}
          theme={displayTheme}
          statusOverride={endingReceipt ? printerPresentation.status : undefined}
          mode={printerPresentation.mode}
          archiveState={printerPresentation.archiveState}
        />
        {receipt}
      </div>
    )

    const keepBusy = receiptEndingState?.kind === 'keep-ritual'
      && receiptEndingState.phase !== 'complete'

    return (
      <section
        className="receipt-machine"
        data-phase={displayPhase}
        data-theme={displayTheme.id}
        data-receipt-ending-state={receiptEndingState?.kind}
        data-keep-phase={keepPhase}
        aria-label="Emotional point of sale terminal and thermal printer"
        aria-busy={(isBusy && !endingReceipt) || keepBusy}
      >
        {displayIsComplete && !threeEndingsEnabled ? (
          <EvidenceViewer
            paperName={displayTheme.shortName}
            receiptNumber={displayReceiptNumber}
            headingRef={completionRef}
            printerHead={<PrinterShell phase={displayPhase} theme={displayTheme} />}
            receipt={receipt}
            shareText={displayShareCopy}
            createExport={createExport}
            onNew={makeAnother}
            onReprint={printAgain}
          />
        ) : (
          <>
            {appliance}

            {displayIsComplete && threeEndingsEnabled && receiptEndingState && (
              <ReceiptEndingExperience
                state={receiptEndingState}
                dispatch={onReceiptEndingEvent}
                headingRef={completionRef}
                persistenceStatus={receiptEndingPersistenceStatus}
                reducedMotion={reducedMotion}
                sensory={sensory}
                onCommitKeepArchive={onCommitKeepArchive}
                onExportLocalCopy={onExportLocalCopy}
                onCloseKeepCompletion={onCloseKeepCompletion}
              />
            )}

            {!displayIsComplete && state.phase === 'error' && (
              <div className="printer-error" role="alert">
                <strong>REGISTER JAMMED</strong>
                <span>{state.errorMessage}</span>
                <small>The emotional transaction remains valid.</small>
              </div>
            )}

            {!displayIsComplete && (
              <>
                <div className="receipt-actions">
                  <RingItUpButton
                    label={getRingButtonLabel(state.phase, theme.id)}
                    disabled={items.length === 0 || isBusy}
                    onClick={printAgain}
                  />
                  <button
                    className="text-button"
                    type="button"
                    onClick={clear}
                    disabled={isBusy}
                  >
                    clear transaction
                  </button>
                </div>

                <button
                  className="sound-toggle"
                  type="button"
                  aria-pressed={soundEnabled}
                  onClick={toggleSound}
                >
                  SOUND: {soundEnabled ? 'LOW' : 'OFF'}
                </button>

                <p className="privacy-note">
                  Nothing leaves your browser. Your bad day remains locally sourced.
                </p>
              </>
            )}
          </>
        )}

        <p className="sr-only" aria-live="polite">
          {getConciseMachineAnnouncement(displayPhase)}
        </p>
      </section>
    )
  },
)

function getPrinterPresentation(state: ReceiptEndingState | null): {
  status: string
  mode: 'receipt' | 'archive'
  archiveState: PrinterArchiveState
} {
  if (state?.kind === 'keep-recovery') {
    return {
      status: 'RECORD CLOSED',
      mode: 'archive',
      archiveState: 'recovery',
    }
  }

  if (state?.kind !== 'keep-ritual') {
    return {
      status: 'DAY DOCUMENTED',
      mode: 'receipt',
      archiveState: 'closed',
    }
  }

  switch (state.phase) {
    case 'cut':
    case 'align':
    case 'sleeve-rising':
    case 'sleeve-receiving':
      return {
        status: 'RECORD CLOSED',
        mode: 'receipt',
        archiveState: 'closed',
      }
    case 'label-registering':
      return {
        status: 'PRIVATE ARCHIVE',
        mode: 'archive',
        archiveState: 'closed',
      }
    case 'archive-opening':
      return {
        status: 'PRIVATE ARCHIVE',
        mode: 'archive',
        archiveState: 'opening',
      }
    case 'archiving':
      return {
        status: 'PRIVATE ARCHIVE',
        mode: 'archive',
        archiveState: 'receiving',
      }
    case 'archive-closing':
      return {
        status: 'PRIVATE ARCHIVE',
        mode: 'archive',
        archiveState: state.archivedAt ? 'stored' : 'closing',
      }
    case 'complete':
      return {
        status: 'PRIVATE ARCHIVE',
        mode: 'archive',
        archiveState: 'stored',
      }
  }
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ))

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reducedMotion
}
