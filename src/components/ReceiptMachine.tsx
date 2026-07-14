import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { snapshotDraft } from '../draftReceipt'
import { useReceiptPrinter } from '../hooks/useReceiptPrinter'
import {
  getPrinterAnnouncement,
  getRingButtonLabel,
} from '../printer/printerMachine'
import { createPrinterSoundController } from '../printer/printerSounds'
import type { PrinterPhase } from '../printer/printerTypes'
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
  onExport: (format: ExportFormat) => void
  onCopyShare: () => void | Promise<void>
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
    onExport,
    onCopyShare,
    onTransactionComplete,
    onMakeAnother,
    onClear,
    onStateChange,
  }, ref) {
    const [soundEnabled, setSoundEnabled] = useState(false)
    const [shareCopied, setShareCopied] = useState(false)
    const [committedItems, setCommittedItems] = useState<ReceiptItem[]>(() => snapshotDraft(items))
    const soundEnabledRef = useRef(soundEnabled)
    const recordedReceipt = useRef<string | null>(null)
    const copyResetTimer = useRef<number | null>(null)
    const commitGuard = useRef(false)
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
    }, [isComplete, onTransactionComplete, state.receiptNumber])

    useEffect(() => () => {
      if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current)
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
      setShareCopied(false)
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
      setShareCopied(false)
      setCommittedItems(snapshotDraft(items))
      void startPrinting().finally(() => {
        commitGuard.current = false
      })
    }

    useImperativeHandle(ref, () => ({
      ringItUp: printAgain,
      reset: resetForNew,
    }))

    const copyShare = async () => {
      await onCopyShare()
      setShareCopied(true)
      if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current)
      copyResetTimer.current = window.setTimeout(() => setShareCopied(false), 1800)
    }

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
            <div className="post-print-status">
              <span>TRANSACTION RECORDED</span>
              <strong>Evidence issued. No further explanation required.</strong>
            </div>

            <div className="export-grid" aria-label="Save receipt formats">
              <button type="button" onClick={() => onExport('full')}>
                <span>FULL</span><strong>SAVE THE EVIDENCE</strong><small>complete artifact</small>
              </button>
              <button type="button" onClick={() => onExport('share')}>
                <span>4:5</span><strong>SHARE CARD</strong><small>1080 × 1350</small>
              </button>
              <button type="button" onClick={() => onExport('story')}>
                <span>9:16</span><strong>STORY STRIP</strong><small>1080 × 1920</small>
              </button>
            </div>

            <div className="share-copy">
              <span>GENERATED SHARE COPY</span>
              <p>{shareCopy}</p>
              <button type="button" onClick={() => { void copyShare() }}>
                {shareCopied ? 'COPIED TO CLIPBOARD' : 'COPY SHARE TEXT'}
              </button>
            </div>

            <div className="post-print-actions">
              <button type="button" className="secondary-button" onClick={makeAnother}>
                MAKE ANOTHER TRANSACTION
              </button>
              <button type="button" className="text-button" onClick={printAgain}>
                REPRINT THIS ONE
              </button>
            </div>
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
          {getPrinterAnnouncement(state.phase)}
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
