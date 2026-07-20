import type {
  ReceiptEndingMachineState,
  ReceiptEndingState,
} from './receiptEndingTypes'

export function getReceiptEndingReceipt(state: ReceiptEndingState) {
  return state.receipt
}

export function isReceiptEndingSettling(state: ReceiptEndingMachineState): boolean {
  return state?.kind === 'settling'
}

export function isReceiptDispositionPending(state: ReceiptEndingState): boolean {
  return state.kind === 'settling'
    || state.kind === 'documented'
    || state.kind === 'end-choice'
}

export function isReceiptEndingRecovery(state: ReceiptEndingMachineState): boolean {
  return state?.kind === 'recovery' || state?.kind === 'keep-recovery'
}
