import type { ReceiptEndingState } from './receiptEndingTypes'

export function getReceiptEndingReceipt(state: ReceiptEndingState) {
  return state.receipt
}

export function isReceiptDispositionPending(state: ReceiptEndingState): boolean {
  return state.kind === 'documented' || state.kind === 'end-choice'
}

export function isReceiptEndingRecovery(state: ReceiptEndingState): boolean {
  return state.kind === 'recovery'
}
