import type { CompletedReceiptSnapshot } from './completedReceipt'

export type ReceiptEndingFailure =
  | 'persistence-unavailable'
  | 'malformed-persisted-state'
  | 'unknown'

export type KeepRitualPhase =
  | 'cut'
  | 'align'
  | 'sleeve-rising'
  | 'sleeve-receiving'
  | 'label-registering'
  | 'archive-opening'
  | 'archiving'
  | 'archive-closing'
  | 'complete'

export type KeepArchiveFailure =
  | 'storage-unavailable'
  | 'storage-write-failed'
  | 'archive-validation-failed'

export type ReceiptEndingState =
  | { kind: 'settling'; receipt: CompletedReceiptSnapshot }
  | { kind: 'documented'; receipt: CompletedReceiptSnapshot }
  | { kind: 'end-choice'; receipt: CompletedReceiptSnapshot }
  | {
      kind: 'keep-ritual'
      receipt: CompletedReceiptSnapshot
      phase: KeepRitualPhase
      archiveAttempt: number
      archivedAt?: string
    }
  | {
      kind: 'keep-recovery'
      receipt: CompletedReceiptSnapshot
      reason: KeepArchiveFailure
      archiveAttempt: number
    }
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
  | { type: 'KEEP_CUT_COMPLETED' }
  | { type: 'KEEP_ALIGNMENT_COMPLETED' }
  | { type: 'KEEP_SLEEVE_RAISED' }
  | { type: 'KEEP_RECEIPT_SLEEVED' }
  | { type: 'KEEP_LABEL_REGISTERED' }
  | { type: 'KEEP_ARCHIVE_OPENED' }
  | { type: 'KEEP_RECEIPT_INSERTED' }
  | { type: 'KEEP_ARCHIVE_CLOSED'; archivedAt: string }
  | { type: 'KEEP_ARCHIVE_COMMITTED' }
  | { type: 'KEEP_ARCHIVE_FAILED'; reason: KeepArchiveFailure }
  | { type: 'RETRY_KEEP_ARCHIVE'; archivedAt: string }
  | { type: 'RETURN_TO_DOCUMENTED' }
  | { type: 'CLOSE_KEEP_COMPLETION' }
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
