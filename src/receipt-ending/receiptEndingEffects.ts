import type { CompletedReceiptSnapshot } from './completedReceipt'
import type {
  ReceiptEndingMachineState,
  ReceiptEndingPersistenceStatus,
  ReceiptEndingState,
} from './receiptEndingTypes'

export const RECEIPT_COMPLETION_PAUSE_MS = 700

export function createNewReceiptEndingState(
  receipt: CompletedReceiptSnapshot,
): ReceiptEndingState {
  return { kind: 'settling', receipt }
}

export function createRestoredReceiptEndingState(
  receipt: CompletedReceiptSnapshot,
): ReceiptEndingState {
  return { kind: 'documented', receipt }
}

export function adoptCompletedReceipt(
  current: ReceiptEndingMachineState,
  receipt: CompletedReceiptSnapshot,
): ReceiptEndingState {
  if (current?.receipt.receiptNumber === receipt.receiptNumber) return current
  return createNewReceiptEndingState(receipt)
}

export function persistenceStatusFromSaveResult(saved: boolean): ReceiptEndingPersistenceStatus {
  return saved ? 'saved' : 'failed'
}
