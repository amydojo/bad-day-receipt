import { useCallback, useEffect, useReducer, useRef } from 'react'
import { makeReceiptNumber } from '../receipt'
import {
  getScanRevealCounts,
  initialPrinterState,
  isPrinterBusy,
  mechanicalEase,
  printerReducer,
} from '../printer/printerMachine'
import { REDUCED_MOTION } from '../printer/productionMotion'
import { PRINTER_TIMING } from '../printer/printerTiming'
import type {
  UseReceiptPrinterOptions,
  UseReceiptPrinterResult,
} from '../printer/printerTypes'

export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)

    const abort = () => {
      window.clearTimeout(timeout)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal.addEventListener('abort', abort, { once: true })
  })
}

export function getDevelopmentPhaseHold(): number {
  if (!import.meta.env.DEV || typeof window === 'undefined') return 0
  return new URLSearchParams(window.location.search).get('qualityPhaseHold') === '1'
    ? 5000
    : 0
}

export function animatePaperProgress({
  duration,
  signal,
  onProgress,
}: {
  duration: number
  signal: AbortSignal
  onProgress: (progress: number) => void
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    let frameId = 0

    const abort = () => {
      cancelAnimationFrame(frameId)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const frame = (now: number) => {
      if (signal.aborted) {
        abort()
        return
      }

      const raw = Math.min((now - start) / duration, 1)
      onProgress(mechanicalEase(raw))

      if (raw < 1) {
        frameId = requestAnimationFrame(frame)
      } else {
        signal.removeEventListener('abort', abort)
        resolve()
      }
    }

    signal.addEventListener('abort', abort, { once: true })
    frameId = requestAnimationFrame(frame)
  })
}

export function useReceiptPrinter({
  itemCount,
  couponCount,
  themeId,
  reducedMotion,
  onReceiptNumberChange,
  sensory,
}: UseReceiptPrinterOptions): UseReceiptPrinterResult {
  const [state, dispatch] = useReducer(printerReducer, initialPrinterState)
  const activeController = useRef<AbortController | null>(null)

  const stopFeed = useCallback(() => {
    sensory?.emit('thermal-feed-stop')
  }, [sensory])

  const resetPrinter = useCallback(() => {
    activeController.current?.abort()
    activeController.current = null
    sensory?.reset()
    dispatch({ type: 'RESET' })
  }, [sensory])

  useEffect(() => () => {
    activeController.current?.abort()
    sensory?.reset()
  }, [sensory])

  const startPrinting = useCallback(async () => {
    activeController.current?.abort()
    sensory?.reset()

    const controller = new AbortController()
    activeController.current = controller
    const { signal } = controller
    const nextReceiptNumber = makeReceiptNumber()
    const phaseHold = getDevelopmentPhaseHold()
    const hold = () => phaseHold > 0 ? wait(phaseHold, signal) : Promise.resolve()

    onReceiptNumberChange(nextReceiptNumber)
    dispatch({ type: 'START', receiptNumber: nextReceiptNumber })
    sensory?.emit('register-clack')

    try {
      await hold()

      if (reducedMotion) {
        await wait(REDUCED_MOTION.accepted, signal)
        dispatch({ type: 'BEGIN_SCAN' })
        sensory?.emit('barcode-scan')
        await wait(REDUCED_MOTION.scanned, signal)
        if (itemCount > 0) dispatch({ type: 'REVEAL_LINE', lineIndex: itemCount - 1 })
        dispatch({ type: 'BEGIN_TOTALS' })
        dispatch({ type: 'REVEAL_TOTAL', rowIndex: 3 })
        await wait(REDUCED_MOTION.blankPaper, signal)
        dispatch({ type: 'BEGIN_FEED' })
        sensory?.emit('thermal-feed-start')
        dispatch({ type: 'SET_PAPER_PROGRESS', progress: 1 })
        await wait(REDUCED_MOTION.printedEvidence, signal)
        stopFeed()

        if (themeId === 'cvs' && couponCount > 0) {
          dispatch({ type: 'FALSE_COMPLETE' })
          await wait(REDUCED_MOTION.apparentCompletion, signal)
          dispatch({ type: 'BEGIN_COUPONS' })
          sensory?.emit('cvs-printer-restart')
          sensory?.emit('thermal-feed-start')
          dispatch({ type: 'SET_COUPON_PROGRESS', progress: 1 })
          await wait(REDUCED_MOTION.couponReveal, signal)
          stopFeed()
        }

        dispatch({ type: 'STAMP' })
        sensory?.emit('verdict-impact')
        await wait(REDUCED_MOTION.complete, signal)
        dispatch({ type: 'COMPLETE' })
        sensory?.emit('machine-complete')
        return
      }

      await wait(
        PRINTER_TIMING.buttonDepression +
        PRINTER_TIMING.dockCompression +
        PRINTER_TIMING.chamberSettle +
        PRINTER_TIMING.preScanBreath,
        signal,
      )

      dispatch({ type: 'BEGIN_SCAN' })
      sensory?.emit('barcode-scan')
      await hold()

      const revealCounts = getScanRevealCounts(itemCount)
      const scanStep = Math.max(1, PRINTER_TIMING.scannerSweep / Math.max(revealCounts.length, 1))
      for (const count of revealCounts) {
        dispatch({ type: 'REVEAL_LINE', lineIndex: count - 1 })
        await wait(scanStep, signal)
      }

      await wait(PRINTER_TIMING.postScanBreath, signal)
      dispatch({ type: 'BEGIN_TOTALS' })
      await hold()

      const totalStep = Math.max(1, PRINTER_TIMING.printerWake / 4)
      for (let index = 0; index < 4; index += 1) {
        dispatch({ type: 'REVEAL_TOTAL', rowIndex: index })
        await wait(totalStep, signal)
      }

      await wait(
        PRINTER_TIMING.blankPaperHold + PRINTER_TIMING.blankLeaderReveal,
        signal,
      )

      dispatch({ type: 'BEGIN_FEED' })
      await hold()
      sensory?.emit('thermal-feed-start')
      await animatePaperProgress({
        duration: themeId === 'cvs'
          ? PRINTER_TIMING.cvsPrimaryFeedDuration
          : PRINTER_TIMING.feedDuration,
        signal,
        onProgress: (progress) => dispatch({ type: 'SET_PAPER_PROGRESS', progress }),
      })
      stopFeed()

      if (themeId === 'cvs' && couponCount > 0) {
        await wait(PRINTER_TIMING.cvsCompletionSettle, signal)
        dispatch({ type: 'FALSE_COMPLETE' })
        await hold()
        await wait(
          PRINTER_TIMING.cvsApparentCompletion + PRINTER_TIMING.falseCompletePause,
          signal,
        )
        await wait(
          PRINTER_TIMING.cvsAdditionalRewardsReveal +
          PRINTER_TIMING.cvsMessageReadingHold,
          signal,
        )

        dispatch({ type: 'BEGIN_COUPONS' })
        await hold()
        sensory?.emit('cvs-printer-restart')
        await wait(PRINTER_TIMING.cvsPrinterRestart, signal)
        sensory?.emit('thermal-feed-start')
        await animatePaperProgress({
          duration: PRINTER_TIMING.couponFeedDuration,
          signal,
          onProgress: (progress) => dispatch({ type: 'SET_COUPON_PROGRESS', progress }),
        })
        stopFeed()
        await wait(PRINTER_TIMING.cvsTrueCompleteHold, signal)
      }

      await wait(PRINTER_TIMING.verdictSilence, signal)
      dispatch({ type: 'STAMP' })
      await hold()
      sensory?.emit('verdict-impact')
      await wait(PRINTER_TIMING.stampDuration, signal)
      await wait(PRINTER_TIMING.evidenceSettlement, signal)
      dispatch({ type: 'COMPLETE' })
      sensory?.emit('machine-complete')
    } catch (error) {
      stopFeed()
      if (error instanceof DOMException && error.name === 'AbortError') return
      sensory?.emit('machine-error')
      dispatch({ type: 'FAIL', message: 'The emotional transaction remains valid.' })
    } finally {
      if (activeController.current === controller) activeController.current = null
    }
  }, [
    couponCount,
    itemCount,
    onReceiptNumberChange,
    reducedMotion,
    sensory,
    stopFeed,
    themeId,
  ])

  return {
    state,
    isBusy: isPrinterBusy(state.phase),
    isComplete: state.phase === 'complete',
    startPrinting,
    resetPrinter,
  }
}
