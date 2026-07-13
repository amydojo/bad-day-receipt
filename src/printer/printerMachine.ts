import type { ReceiptThemeId } from '../themes'
import type { LedStatus, PrinterEvent, PrinterPhase, PrinterState } from './printerTypes'

export const initialPrinterState: PrinterState = {
  phase: 'idle',
  visibleLineCount: 0,
  visibleTotalRows: 0,
  paperProgress: 1,
  couponProgress: 0,
  receiptNumber: '',
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

export function printerReducer(state: PrinterState, event: PrinterEvent): PrinterState {
  switch (event.type) {
    case 'START':
      return {
        phase: 'arming',
        visibleLineCount: 0,
        visibleTotalRows: 0,
        paperProgress: 0,
        couponProgress: 0,
        receiptNumber: event.receiptNumber,
      }
    case 'BEGIN_SCAN':
      return { ...state, phase: 'scanning' }
    case 'REVEAL_LINE':
      return { ...state, visibleLineCount: Math.max(state.visibleLineCount, event.lineIndex + 1) }
    case 'BEGIN_TOTALS':
      return { ...state, phase: 'calculating' }
    case 'REVEAL_TOTAL':
      return { ...state, visibleTotalRows: Math.max(state.visibleTotalRows, event.rowIndex + 1) }
    case 'BEGIN_FEED':
      return { ...state, phase: 'feeding' }
    case 'SET_PAPER_PROGRESS':
      return { ...state, paperProgress: clamp01(event.progress) }
    case 'STAMP':
      return { ...state, phase: 'stamping' }
    case 'FALSE_COMPLETE':
      return { ...state, phase: 'falseComplete' }
    case 'BEGIN_COUPONS':
      return { ...state, phase: 'printingCoupons' }
    case 'SET_COUPON_PROGRESS':
      return { ...state, couponProgress: clamp01(event.progress) }
    case 'COMPLETE':
      return { ...state, phase: 'complete', paperProgress: 1 }
    case 'RESET':
      return initialPrinterState
    case 'FAIL':
      return { ...state, phase: 'error', errorMessage: event.message }
  }
}

export function isPrinterBusy(phase: PrinterPhase): boolean {
  return !['idle', 'complete', 'error'].includes(phase)
}

export function getPrinterStatus(phase: PrinterPhase): string {
  switch (phase) {
    case 'idle': return 'READY'
    case 'arming': return 'PROCESSING'
    case 'scanning': return 'SCANNING ITEMS'
    case 'calculating': return 'CALCULATING DAMAGE'
    case 'feeding': return 'PRINTING'
    case 'stamping': return 'AUTHORIZING'
    case 'falseComplete': return 'COMPLETE'
    case 'printingCoupons': return 'PRINTING REWARDS'
    case 'complete': return 'RECORDED'
    case 'error': return 'REGISTER JAMMED'
  }
}

export function getLedStatus(phase: PrinterPhase): LedStatus {
  if (phase === 'error') return 'error'
  if (phase === 'complete' || phase === 'falseComplete') return 'complete'
  if (phase === 'idle') return 'idle'
  return 'busy'
}

export function getRingButtonLabel(phase: PrinterPhase, themeId: ReceiptThemeId): string {
  if (phase === 'error') return 'TRY REGISTER AGAIN'
  if (phase === 'complete') return 'RING IT UP AGAIN'
  if (phase === 'falseComplete') return 'RECEIPT COMPLETE'
  if (phase === 'printingCoupons') {
    return themeId === 'cvs' ? 'PRINTING REWARDS YOU DID NOT REQUEST' : 'PRINTING'
  }
  if (phase !== 'idle') return 'PROCESSING'
  return 'RING IT UP'
}

export function getPrinterAnnouncement(phase: PrinterPhase): string {
  switch (phase) {
    case 'arming': return 'Receipt processing started'
    case 'calculating': return 'Receipt totals calculated'
    case 'feeding': return 'Receipt printing'
    case 'stamping': return 'Receipt printed'
    case 'printingCoupons': return 'Additional CVS coupons printing'
    case 'complete': return 'Receipt complete'
    case 'error': return 'Printer error'
    default: return ''
  }
}

export function getScanRevealCounts(itemCount: number): number[] {
  if (itemCount <= 0) return []
  if (itemCount <= 8) return Array.from({ length: itemCount }, (_, index) => index + 1)
  return [1, 2, 3, 4, 5, itemCount - 1, itemCount]
}

export function mechanicalEase(progress: number): number {
  const clamped = clamp01(progress)
  const base = 1 - Math.pow(1 - clamped, 3)
  const vibration = Math.sin(clamped * Math.PI * 18) * 0.008 * (1 - clamped)
  return clamp01(base + vibration)
}
