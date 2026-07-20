import type { CompletedReceiptSnapshot } from './completedReceipt'

export type ReceiptEndingFailure =
  | 'persistence-unavailable'
  | 'malformed-persisted-state'
  | 'unknown'

export type ReceiptEndingState =
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

export type ReceiptEndingEvent =
  | { type: 'OPEN_END_CHOICE' }
  | { type: 'SELECT_KEEP' }
  | { type: 'SELECT_RELEASE' }
  | { type: 'SELECT_CARRY' }
  | { type: 'BACK' }
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
