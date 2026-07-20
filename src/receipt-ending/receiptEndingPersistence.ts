import {
  parseCompletedReceiptSnapshot,
  type CompletedReceiptSnapshot,
} from './completedReceipt'
import type {
  ArchivedReceipt,
  PendingRelease,
  ReceiptDisposition,
} from './receiptEndingTypes'

export const MAX_PRIVATE_ARCHIVE = 5
export const MAX_RECEIPT_DISPOSITIONS = 20

export function parsePendingReceipt(value: unknown): CompletedReceiptSnapshot | null {
  return parseCompletedReceiptSnapshot(value)
}

export function parsePendingRelease(value: unknown): PendingRelease | null {
  if (!isRecord(value) || typeof value.undoUntil !== 'string') return null
  const receipt = parseCompletedReceiptSnapshot(value.receipt)
  if (!receipt || Number.isNaN(Date.parse(value.undoUntil))) return null
  return { receipt, undoUntil: value.undoUntil }
}

export function sanitizePrivateArchive(value: unknown): ArchivedReceipt[] {
  if (!Array.isArray(value)) return []

  const parsed = value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.archivedAt !== 'string') return []
    if (Number.isNaN(Date.parse(candidate.archivedAt))) return []
    const receipt = parseCompletedReceiptSnapshot(candidate.receipt)
    return receipt ? [{ receipt, archivedAt: candidate.archivedAt }] : []
  })

  return parsed
    .filter((entry, index, array) => (
      array.findIndex((candidate) => (
        candidate.receipt.receiptNumber === entry.receipt.receiptNumber
      )) === index
    ))
    .slice(0, MAX_PRIVATE_ARCHIVE)
}

export function sanitizeReceiptDispositions(value: unknown): ReceiptDisposition[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isReceiptDisposition)
    .filter((entry, index, array) => (
      array.findIndex((candidate) => candidate.receiptNumber === entry.receiptNumber) === index
    ))
    .slice(0, MAX_RECEIPT_DISPOSITIONS)
}

function isReceiptDisposition(value: unknown): value is ReceiptDisposition {
  if (!isRecord(value)) return false
  return typeof value.receiptNumber === 'string'
    && value.receiptNumber.length > 0
    && (value.disposition === 'kept'
      || value.disposition === 'released'
      || value.disposition === 'carried')
    && typeof value.decidedAt === 'string'
    && !Number.isNaN(Date.parse(value.decidedAt))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
