import { useCallback, useEffect, useReducer, useRef } from 'react'
import { makeReceiptNumber } from '../receipt'
import {
  getScanRevealCounts,
  initialPrinterState,
  isPrinterBusy,
  mechanicalEase,
  printerReducer,
} from '../printer/printerMachine'
import { tinyHaptic } from '../printer/printerSounds'
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
  sounds,
}: UseReceiptPrinterOptions): UseReceiptPrinterResult {
  const [state, dispatch] = useReducer(printerReducer, initialPrinterState)
  const activeController = useRef<AbortController | null>(null)

  const resetPrinter = useCallback(() => {
    activeController.current?.abort()
    activeController.current = null
    sounds?.stopFeed()
    dispatch({ type: 'RESET' })
  }, [sounds])

  useEffect(() => () => {
    activeController.current?.abort()
    sounds?.stopFeed()
  }, [sounds])

  const startPrinting = useCallback(async () => {
    activeController.current?.abort()
    sounds?.stopFeed()

    const controller = new AbortController()
    activeController.current = controller
    const { signal } = controller
    const nextReceiptNumber = makeReceiptNumber()

    onReceiptNumberChange(nextReceiptNumber)
    dispatch({ type: 'START', receiptNumber: nextReceiptNumber })
    sounds?.playPress()
    tinyHaptic(8)

    try {
      if (reducedMotion) {
        if (itemCount > 0) {
          dispatch({ type: 'REVEAL_LINE', lineIndex: itemCount - 1 })
        }
        dispatch({ type: 'REVEAL_TOTAL', rowIndex: 3 })
        dispatch({ type: 'SET_PAPER_PROGRESS', progress: 1 })
        if (themeId === 'cvs' && couponCount > 0) {
          dispatch({ type: 'SET_COUPON_PROGRESS', progress: 1 })
        }
        dispatch({ type: 'STAMP' })
        await wait(120, signal)
        dispatch({ type: 'COMPLETE' })
        return
      }

      await wait(PRINTER_TIMING.arming + PRINTER_TIMING.scanStartDelay, signal)
      dispatch({ type: 'BEGIN_SCAN' })

      const revealCounts = getScanRevealCounts(itemCount)
      for (let index = 0; index < revealCounts.length; index += 1) {
        const count = revealCounts[index]
        dispatch({ type: 'REVEAL_LINE', lineIndex: count - 1 })
        sounds?.playScan()

        const delay = index === 0
          ? PRINTER_TIMING.firstLine
          : index === revealCounts.length - 1
            ? PRINTER_TIMING.lastLine
            : PRINTER_TIMING.middleLine

        await wait(delay, signal)
      }

      dispatch({ type: 'BEGIN_TOTALS' })
      await wait(PRINTER_TIMING.totalsGap, signal)

      for (let index = 0; index < 4; index += 1) {
        dispatch({ type: 'REVEAL_TOTAL', rowIndex: index })
        await wait(PRINTER_TIMING.totalRow, signal)
      }

      dispatch({ type: 'BEGIN_FEED' })
      sounds?.playFeed()
      await animatePaperProgress({
        duration: PRINTER_TIMING.feedDuration,
        signal,
        onProgress: (progress) => {
          dispatch({ type: 'SET_PAPER_PROGRESS', progress })
        },
      })
      sounds?.stopFeed()

      dispatch({ type: 'STAMP' })
      sounds?.playStamp()
      tinyHaptic(12)
      await wait(PRINTER_TIMING.stampDuration, signal)

      if (themeId === 'cvs' && couponCount > 0) {
        dispatch({ type: 'FALSE_COMPLETE' })
        await wait(PRINTER_TIMING.falseCompletePause, signal)

        dispatch({ type: 'BEGIN_COUPONS' })
        sounds?.playCouponResume()
        tinyHaptic(6)
        sounds?.playFeed()

        await animatePaperProgress({
          duration: PRINTER_TIMING.couponFeedDuration,
          signal,
          onProgress: (progress) => {
            dispatch({ type: 'SET_COUPON_PROGRESS', progress })
          },
        })
        sounds?.stopFeed()
      }

      dispatch({ type: 'COMPLETE' })
    } catch (error) {
      sounds?.stopFeed()
      if (error instanceof DOMException && error.name === 'AbortError') return

      dispatch({
        type: 'FAIL',
        message: 'The emotional transaction remains valid.',
      })
    } finally {
      if (activeController.current === controller) {
        activeController.current = null
      }
    }
  }, [
    couponCount,
    itemCount,
    onReceiptNumberChange,
    reducedMotion,
    sounds,
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
