import {
  parseCompletedReceiptSnapshot,
  type CompletedReceiptSnapshot,
} from './completedReceipt'
import type {
  ArchivedReceipt,
  PendingRelease,
  ReceiptDisposition,
  ReleaseOrigin,
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

  const origin = value.origin == null
    ? { kind: 'pending' as const }
    : parseReleaseOrigin(value.origin)
  if (!origin) return null

  const previousDisposition = value.previousDisposition == null
    ? null
    : parseReceiptDisposition(value.previousDisposition)
  if (value.previousDisposition != null && !previousDisposition) return null

  return {
    receipt,
    undoUntil: value.undoUntil,
    origin,
    previousDisposition,
  }
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
    .flatMap((candidate) => {
      const parsed = parseReceiptDisposition(candidate)
      return parsed ? [parsed] : []
    })
    .filter((entry, index, array) => (
      array.findIndex((candidate) => candidate.receiptNumber === entry.receiptNumber) === index
    ))
    .slice(0, MAX_RECEIPT_DISPOSITIONS)
}

function parseReleaseOrigin(value: unknown): ReleaseOrigin | null {
  if (!isRecord(value)) return null
  if (value.kind === 'pending') return { kind: 'pending' }
  if (value.kind === 'archive'
    && typeof value.archivedAt === 'string'
    && !Number.isNaN(Date.parse(value.archivedAt))) {
    return { kind: 'archive', archivedAt: value.archivedAt }
  }
  return null
}

function parseReceiptDisposition(value: unknown): ReceiptDisposition | null {
  if (!isRecord(value)) return null
  if (typeof value.receiptNumber !== 'string' || value.receiptNumber.length === 0) return null
  if (value.disposition !== 'kept'
    && value.disposition !== 'released'
    && value.disposition !== 'carried') return null
  if (typeof value.decidedAt !== 'string' || Number.isNaN(Date.parse(value.decidedAt))) return null
  return {
    receiptNumber: value.receiptNumber,
    disposition: value.disposition,
    decidedAt: value.decidedAt,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
