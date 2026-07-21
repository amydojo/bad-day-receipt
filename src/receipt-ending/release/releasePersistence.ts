import type { CompletedReceiptSnapshot } from '../completedReceipt'
import {
  MAX_PRIVATE_ARCHIVE,
  MAX_RECEIPT_DISPOSITIONS,
  sanitizePrivateArchive,
  sanitizeReceiptDispositions,
} from '../receiptEndingPersistence'
import type {
  ArchivedReceipt,
  PendingRelease,
  ReceiptDisposition,
  ReleaseOrigin,
} from '../receiptEndingTypes'

export const RELEASE_UNDO_MS = 8_000

export interface ReleaseProjection {
  pendingReceipt: CompletedReceiptSnapshot | null
  pendingRelease: PendingRelease
  privateArchive: ArchivedReceipt[]
  receiptDispositions: ReceiptDisposition[]
}

export interface UndoReleaseProjection {
  pendingReceipt: CompletedReceiptSnapshot | null
  pendingRelease: null
  privateArchive: ArchivedReceipt[]
  receiptDispositions: ReceiptDisposition[]
}

export function createReleaseUndoUntil(now = new Date()): string {
  return new Date(now.getTime() + RELEASE_UNDO_MS).toISOString()
}

export function isReleaseUndoAvailable(
  pendingRelease: PendingRelease,
  now = new Date(),
): boolean {
  return new Date(pendingRelease.undoUntil).getTime() > now.getTime()
}

export function createReleaseProjection({
  pendingReceipt,
  privateArchive,
  receiptDispositions,
  receipt,
  origin,
  undoUntil,
}: {
  pendingReceipt: CompletedReceiptSnapshot | null
  privateArchive: ArchivedReceipt[]
  receiptDispositions: ReceiptDisposition[]
  receipt: CompletedReceiptSnapshot
  origin: ReleaseOrigin
  undoUntil: string
}): ReleaseProjection | null {
  if (!isIsoDate(undoUntil)) return null
  const undoDeadline = new Date(undoUntil).getTime()
  const decidedAt = new Date(undoDeadline - RELEASE_UNDO_MS).toISOString()

  const previousDisposition = receiptDispositions.find((entry) => (
    entry.receiptNumber === receipt.receiptNumber
  )) ?? null

  let nextPendingReceipt = pendingReceipt
  let nextArchive = sanitizePrivateArchive(privateArchive)

  if (origin.kind === 'pending') {
    if (pendingReceipt?.receiptNumber !== receipt.receiptNumber) return null
    nextPendingReceipt = null
  } else {
    const source = nextArchive.find((entry) => (
      entry.receipt.receiptNumber === receipt.receiptNumber
      && entry.archivedAt === origin.archivedAt
    ))
    if (!source) return null
    nextArchive = nextArchive.filter((entry) => (
      entry.receipt.receiptNumber !== receipt.receiptNumber
    ))
  }

  const pendingRelease: PendingRelease = {
    receipt,
    undoUntil,
    origin,
    previousDisposition,
  }

  return {
    pendingReceipt: nextPendingReceipt,
    pendingRelease,
    privateArchive: nextArchive,
    receiptDispositions: replaceDisposition(receiptDispositions, {
      receiptNumber: receipt.receiptNumber,
      disposition: 'released',
      decidedAt,
    }),
  }
}

export function createUndoReleaseProjection({
  pendingReceipt,
  pendingRelease,
  privateArchive,
  receiptDispositions,
  now = new Date(),
}: {
  pendingReceipt: CompletedReceiptSnapshot | null
  pendingRelease: PendingRelease | null
  privateArchive: ArchivedReceipt[]
  receiptDispositions: ReceiptDisposition[]
  now?: Date
}): UndoReleaseProjection | null {
  if (!pendingRelease || !isReleaseUndoAvailable(pendingRelease, now)) return null

  let nextPendingReceipt = pendingReceipt
  let nextArchive = sanitizePrivateArchive(privateArchive)

  if (pendingRelease.origin.kind === 'pending') {
    if (pendingReceipt && pendingReceipt.receiptNumber !== pendingRelease.receipt.receiptNumber) return null
    nextPendingReceipt = pendingRelease.receipt
  } else {
    nextArchive = sanitizePrivateArchive([
      {
        receipt: pendingRelease.receipt,
        archivedAt: pendingRelease.origin.archivedAt,
      },
      ...nextArchive.filter((entry) => (
        entry.receipt.receiptNumber !== pendingRelease.receipt.receiptNumber
      )),
    ]).slice(0, MAX_PRIVATE_ARCHIVE)
  }

  return {
    pendingReceipt: nextPendingReceipt,
    pendingRelease: null,
    privateArchive: nextArchive,
    receiptDispositions: replaceDisposition(
      receiptDispositions,
      pendingRelease.previousDisposition,
      pendingRelease.receipt.receiptNumber,
    ),
  }
}

export function createExpiredReleaseProjection({
  pendingRelease,
  now = new Date(),
}: {
  pendingRelease: PendingRelease | null
  now?: Date
}): { pendingRelease: null } | null {
  if (!pendingRelease || isReleaseUndoAvailable(pendingRelease, now)) return null
  return { pendingRelease: null }
}

function replaceDisposition(
  current: ReceiptDisposition[],
  next: ReceiptDisposition | null,
  receiptNumber = next?.receiptNumber ?? '',
): ReceiptDisposition[] {
  const filtered = current.filter((entry) => entry.receiptNumber !== receiptNumber)
  return sanitizeReceiptDispositions(next ? [next, ...filtered] : filtered)
    .slice(0, MAX_RECEIPT_DISPOSITIONS)
}

function isIsoDate(value: string): boolean {
  return value.length > 0 && !Number.isNaN(Date.parse(value))
}
