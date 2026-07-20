import type { CompletedReceiptSnapshot } from './completedReceipt'
import type {
  ReceiptEndingPersistenceStatus,
  ReceiptEndingState,
} from './receiptEndingTypes'

export function createInitialReceiptEndingState(
  receipt: CompletedReceiptSnapshot,
): ReceiptEndingState {
  return { kind: 'documented', receipt }
}

export function adoptCompletedReceipt(
  current: ReceiptEndingState | null,
  receipt: CompletedReceiptSnapshot,
): ReceiptEndingState {
  if (current?.receipt.receiptNumber === receipt.receiptNumber) return current
  return createInitialReceiptEndingState(receipt)
}

export function persistenceStatusFromSaveResult(saved: boolean): ReceiptEndingPersistenceStatus {
  return saved ? 'saved' : 'failed'
}
