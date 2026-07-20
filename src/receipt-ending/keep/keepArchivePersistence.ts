import type { CompletedReceiptSnapshot } from '../completedReceipt'
import {
  MAX_PRIVATE_ARCHIVE,
  MAX_RECEIPT_DISPOSITIONS,
  sanitizePrivateArchive,
  sanitizeReceiptDispositions,
} from '../receiptEndingPersistence'
import type {
  ArchivedReceipt,
  ReceiptDisposition,
} from '../receiptEndingTypes'

export interface KeepArchiveProjection {
  privateArchive: ArchivedReceipt[]
  receiptDispositions: ReceiptDisposition[]
  pendingReceipt: null
}

export function appendArchivedReceipt(
  currentArchive: ArchivedReceipt[],
  receipt: CompletedReceiptSnapshot,
  archivedAt: string,
): ArchivedReceipt[] {
  if (!isIsoDate(archivedAt)) return sanitizePrivateArchive(currentArchive)

  return sanitizePrivateArchive([
    { receipt, archivedAt },
    ...currentArchive.filter((entry) => (
      entry.receipt.receiptNumber !== receipt.receiptNumber
    )),
  ]).slice(0, MAX_PRIVATE_ARCHIVE)
}

export function appendReceiptDisposition(
  currentDispositions: ReceiptDisposition[],
  receiptNumber: string,
  decidedAt: string,
): ReceiptDisposition[] {
  if (!receiptNumber || !isIsoDate(decidedAt)) {
    return sanitizeReceiptDispositions(currentDispositions)
  }

  return sanitizeReceiptDispositions([
    {
      receiptNumber,
      disposition: 'kept',
      decidedAt,
    },
    ...currentDispositions.filter((entry) => entry.receiptNumber !== receiptNumber),
  ]).slice(0, MAX_RECEIPT_DISPOSITIONS)
}

export function createKeepArchiveProjection({
  currentArchive,
  currentDispositions,
  pendingReceipt,
  receipt,
  archivedAt,
}: {
  currentArchive: ArchivedReceipt[]
  currentDispositions: ReceiptDisposition[]
  pendingReceipt: CompletedReceiptSnapshot | null
  receipt: CompletedReceiptSnapshot
  archivedAt: string
}): KeepArchiveProjection | null {
  if (!isIsoDate(archivedAt)) return null
  if (pendingReceipt?.receiptNumber !== receipt.receiptNumber) return null

  return {
    privateArchive: appendArchivedReceipt(currentArchive, receipt, archivedAt),
    receiptDispositions: appendReceiptDisposition(
      currentDispositions,
      receipt.receiptNumber,
      archivedAt,
    ),
    pendingReceipt: null,
  }
}

function isIsoDate(value: string): boolean {
  return value.length > 0 && !Number.isNaN(Date.parse(value))
}
