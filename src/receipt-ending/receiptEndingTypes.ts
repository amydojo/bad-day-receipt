import type { CompletedReceiptSnapshot } from './completedReceipt'

export type ReceiptEndingFailure =
  | 'persistence-unavailable'
  | 'malformed-persisted-state'
  | 'unknown'

export type ReceiptEndingState =
  | { kind: 'settling'; receipt: CompletedReceiptSnapshot }
  | { kind: 'documented'; receipt: CompletedReceiptSnapshot }
  | { kind: 'end-choice'; receipt: CompletedReceiptSnapshot }
  | { kind: 'keep-selected'; receipt: CompletedReceiptSnapshot }
  | { kind: 'release-selected'; receipt: CompletedReceiptSnapshot }
  | { kind: 'carry-selected'; receipt: CompletedReceiptSnapshot }
  | {
      kind: 'recovery'
      receipt: CompletedReceiptSnapshot
      reason: ReceiptEndingFailure
    }

export type ReceiptEndingMachineState = ReceiptEndingState | null

export type ReceiptEndingEvent =
  | { type: 'START_NEW_RECEIPT'; receipt: CompletedReceiptSnapshot }
  | { type: 'RESTORE_RECEIPT'; receipt: CompletedReceiptSnapshot }
  | { type: 'CLEAR_RECEIPT_ENDING' }
  | { type: 'PRINT_COMPLETION_SETTLED' }
  | { type: 'SELECT_END_HERE' }
  | { type: 'SELECT_CARRY_FORWARD' }
  | { type: 'SELECT_KEEP' }
  | { type: 'SELECT_RELEASE' }
  | { type: 'BACK_TO_DOCUMENTED' }
  | { type: 'BACK_TO_DISPOSITION' }
  | { type: 'FAIL'; reason: ReceiptEndingFailure }
  | { type: 'RECOVER' }

export interface ArchivedReceipt {
  receipt: CompletedReceiptSnapshot
  archivedAt: string
}

export interface PendingRelease {
  receipt: CompletedReceiptSnapshot
  undoUntil: string
}

export interface ReceiptDisposition {
  receiptNumber: string
  disposition: 'kept' | 'released' | 'carried'
  decidedAt: string
}

export type ReceiptEndingPersistenceStatus =
  | 'unknown'
  | 'saved'
  | 'unavailable'
  | 'failed'
