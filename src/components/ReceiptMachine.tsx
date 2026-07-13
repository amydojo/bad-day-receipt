import { useEffect, useMemo, useRef, useState } from 'react'
import { useReceiptPrinter } from '../hooks/useReceiptPrinter'
import {
  getPrinterAnnouncement,
  getRingButtonLabel,
} from '../printer/printerMachine'
import { createPrinterSoundController } from '../printer/printerSounds'
import type { ReceiptTheme } from '../themes'
import type { ReceiptItem } from '../types'
import { PrinterShell } from './PrinterShell'
import { Receipt } from './Receipt'
import { ReceiptViewport } from './ReceiptViewport'
import { RingItUpButton } from './RingItUpButton'

interface ReceiptMachineProps {
  items: ReceiptItem[]
  receiptNumber: string
  theme: ReceiptTheme
  onReceiptNumberChange: (receiptNumber: string) => void
  onDownload: () => void
  onClear: () => void
}

export function ReceiptMachine({
  items,
  receiptNumber,
  theme,
  onReceiptNumberChange,
  onDownload,
  onClear,
}: ReceiptMachineProps) {
  const [soundEnabled, setSoundEnabled] = useState(false)
  const soundEnabledRef = useRef(soundEnabled)
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

  const previousTheme = useRef(theme.id)
  useEffect(() => {
    if (previousTheme.current !== theme.id) {
      previousTheme.current = theme.id
      resetPrinter()
    }
  }, [resetPrinter, theme.id])

  const isPreview = state.phase === 'idle'
  const visibleLineCount = isPreview ? items.length : state.visibleLineCount
  const visibleTotalRows = isPreview ? 4 : state.visibleTotalRows
  const couponProgress = isPreview ? 1 : state.couponProgress
  const showVerdict = isPreview || [
    'stamping',
    'falseComplete',
    'printingCoupons',
    'complete',
  ].includes(state.phase)

  const clear = () => {
    resetPrinter()
    onClear()
  }

  return (
    <section
      className="receipt-machine"
      data-phase={state.phase}
      data-theme={theme.id}
      aria-label="Thermal receipt printer"
      aria-busy={isBusy}
    >
      <PrinterShell phase={state.phase} theme={theme} />

      <ReceiptViewport
        phase={state.phase}
        paperProgress={isPreview ? 1 : state.paperProgress}
        couponProgress={couponProgress}
        couponCount={couponCount}
      >
        <Receipt
          items={items}
          receiptNumber={receiptNumber}
          theme={theme}
          visibleLineCount={visibleLineCount}
          visibleTotalRows={visibleTotalRows}
          showVerdict={showVerdict}
          couponProgress={couponProgress}
        />
      </ReceiptViewport>

      {state.phase === 'error' && (
        <div className="printer-error" role="alert">
          <strong>REGISTER JAMMED</strong>
          <span>{state.errorMessage}</span>
          <small>The paper machine is simply being difficult.</small>
        </div>
      )}

      <div className="receipt-actions">
        <RingItUpButton
          label={getRingButtonLabel(state.phase, theme.id)}
          disabled={items.length === 0 || isBusy}
          onClick={() => { void startPrinting() }}
        />
        <button
          className="secondary-button"
          type="button"
          onClick={onDownload}
          disabled={items.length === 0 || isBusy}
        >
          {isComplete ? 'save the evidence' : 'save png'}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={clear}
          disabled={isBusy}
        >
          clear
        </button>
      </div>

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
