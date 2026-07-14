import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { snapshotDraft } from '../draftReceipt'
import type { ArtifactExport } from '../export/exportTypes'
import { useReceiptPrinter } from '../hooks/useReceiptPrinter'
import { getConciseMachineAnnouncement } from '../machinePresentation'
import { getRingButtonLabel } from '../printer/printerMachine'
import { createPrinterSoundController } from '../printer/printerSounds'
import type { PrinterPhase } from '../printer/printerTypes'
import { ArtifactActions } from '../soft-machine/ArtifactActions'
import type { ReceiptTheme } from '../themes'
import type { ReceiptItem } from '../types'
import type { ExportFormat } from '../v2'
import { PrinterShell } from './PrinterShell'
import { Receipt } from './Receipt'
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
  onReceiptNumberChange: (receiptNumber: string) => void
  createExport: (format: ExportFormat) => Promise<ArtifactExport>
  onTransactionComplete: (receiptNumber: string) => void
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
    onReceiptNumberChange,
    createExport,
    onTransactionComplete,
    onMakeAnother,
    onClear,
    onStateChange,
  }, ref) {
    const [soundEnabled, setSoundEnabled] = useState(false)
    const [committedItems, setCommittedItems] = useState<ReceiptItem[]>(() => snapshotDraft(items))
    const soundEnabledRef = useRef(soundEnabled)
    const recordedReceipt = useRef<string | null>(null)
    const commitGuard = useRef(false)
    const completionRef = useRef<HTMLDivElement | null>(null)
    soundEnabledRef.current = soundEnabled

    const sounds = useMemo(
      () => createPrinterSoundController(() => soundEnabledRef.current),
      [],
    )
    const reducedMotion = usePrefersReducedMotion()
    const couponCount = theme.coupons?.length ?? 0

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
      sounds,
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
      onTransactionComplete(state.receiptNumber)
      window.requestAnimationFrame(() => completionRef.current?.focus())
    }, [isComplete, onTransactionComplete, state.receiptNumber])

    useEffect(() => () => {
      commitGuard.current = false
    }, [])

    const couponProgress = state.couponProgress
    const showVerdict = [
      'stamping',
      'falseComplete',
      'printingCoupons',
      'complete',
    ].includes(state.phase)
    const showReceipt = shouldRenderIssuedReceipt(state.phase)

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
      void startPrinting().finally(() => {
        commitGuard.current = false
      })
    }

    useImperativeHandle(ref, () => ({
      ringItUp: printAgain,
      reset: resetForNew,
    }))

    return (
      <section
        className="receipt-machine"
        data-phase={state.phase}
        data-theme={theme.id}
        aria-label="Emotional point of sale terminal and thermal printer"
        aria-busy={isBusy}
      >
        <div className="pos-appliance">
          <RegisterTerminal items={issuedItems} theme={theme} phase={state.phase} />
          <PrinterShell phase={state.phase} theme={theme} />

          {showReceipt && (
            <ReceiptViewport
              phase={state.phase}
              paperProgress={state.paperProgress}
              couponProgress={couponProgress}
              couponCount={couponCount}
            >
              <Receipt
                items={issuedItems}
                receiptNumber={receiptNumber}
                theme={theme}
                phase={state.phase}
                visibleLineCount={state.visibleLineCount}
                visibleTotalRows={state.visibleTotalRows}
                showVerdict={showVerdict}
                couponProgress={couponProgress}
                anomaly={anomaly}
              />
            </ReceiptViewport>
          )}
        </div>

        {state.phase === 'error' && (
          <div className="printer-error" role="alert">
            <strong>REGISTER JAMMED</strong>
            <span>{state.errorMessage}</span>
            <small>The paper machine is simply being difficult.</small>
          </div>
        )}

        {!isComplete ? (
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
        ) : (
          <div className="post-print-panel">
            <div className="post-print-status" ref={completionRef} tabIndex={-1}>
              <span>TRANSACTION RECORDED</span>
              <strong>Evidence issued. No further explanation required.</strong>
            </div>

            <ArtifactActions
              shareText={shareCopy}
              createExport={createExport}
              onReset={makeAnother}
              onReprint={printAgain}
            />
          </div>
        )}

        <button
          className="sound-toggle"
          type="button"
          aria-pressed={soundEnabled}
          onClick={() => setSoundEnabled((current) => !current)}
        >
          SOUND: {soundEnabled ? 'TINY' : 'OFF'}
        </button>

        <p className="privacy-note">
          Nothing leaves your browser. Your bad day remains locally sourced.
        </p>

        <p className="sr-only" aria-live="polite">
          {getConciseMachineAnnouncement(state.phase)}
        </p>
      </section>
    )
  },
)

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
