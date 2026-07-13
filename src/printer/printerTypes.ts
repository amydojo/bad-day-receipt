import type { ReceiptThemeId } from '../themes'

export type PrinterPhase =
  | 'idle'
  | 'arming'
  | 'scanning'
  | 'calculating'
  | 'feeding'
  | 'stamping'
  | 'falseComplete'
  | 'printingCoupons'
  | 'complete'
  | 'error'

export interface PrinterState {
  phase: PrinterPhase
  visibleLineCount: number
  visibleTotalRows: number
  paperProgress: number
  couponProgress: number
  receiptNumber: string
  errorMessage?: string
}

export type PrinterEvent =
  | { type: 'START'; receiptNumber: string }
  | { type: 'BEGIN_SCAN' }
  | { type: 'REVEAL_LINE'; lineIndex: number }
  | { type: 'BEGIN_TOTALS' }
  | { type: 'REVEAL_TOTAL'; rowIndex: number }
  | { type: 'BEGIN_FEED' }
  | { type: 'SET_PAPER_PROGRESS'; progress: number }
  | { type: 'STAMP' }
  | { type: 'FALSE_COMPLETE' }
  | { type: 'BEGIN_COUPONS' }
  | { type: 'SET_COUPON_PROGRESS'; progress: number }
  | { type: 'COMPLETE' }
  | { type: 'RESET' }
  | { type: 'FAIL'; message: string }

export type LedStatus = 'idle' | 'busy' | 'complete' | 'error'

export interface PrinterSoundController {
  playPress: () => void
  playScan: () => void
  playFeed: () => void
  stopFeed: () => void
  playStamp: () => void
  playCouponResume: () => void
}

export interface UseReceiptPrinterOptions {
  itemCount: number
  couponCount: number
  themeId: ReceiptThemeId
  reducedMotion: boolean
  onReceiptNumberChange: (receiptNumber: string) => void
  sounds?: PrinterSoundController
}

export interface UseReceiptPrinterResult {
  state: PrinterState
  isBusy: boolean
  isComplete: boolean
  startPrinting: () => Promise<void>
  resetPrinter: () => void
}
