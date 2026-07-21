import { describe, expect, it } from 'vitest'
import { getTheme } from '../../themes'
import { createCompletedReceiptSnapshot } from '../completedReceipt'
import type { ArchivedReceipt, ReceiptDisposition } from '../receiptEndingTypes'
import {
  createExpiredReleaseProjection,
  createReleaseProjection,
  createReleaseUndoUntil,
  createUndoReleaseProjection,
  isReleaseUndoAvailable,
  RELEASE_UNDO_MS,
} from './releasePersistence'

const receipt = createCompletedReceiptSnapshot({
  receiptNumber: 'BD-20-0083',
  completedAt: '2026-07-20T12:00:00.000Z',
  theme: getTheme('original'),
  items: [{ id: 'normal', label: 'Trying to act normal', amount: 14, kind: 'charge', quantity: 1 }],
  total: 15.19,
  itemCount: 1,
  status: 'dented but operational',
  anomaly: null,
  shareCopy: 'Local only.',
})

const decidedAt = '2026-07-20T12:05:00.000Z'
const undoUntil = '2026-07-20T12:05:08.000Z'
const kept: ReceiptDisposition = {
  receiptNumber: receipt.receiptNumber,
  disposition: 'kept',
  decidedAt: '2026-07-20T11:59:00.000Z',
}

describe('Release persistence projections', () => {
  it('uses one exact eight-second absolute Undo deadline', () => {
    const now = new Date(decidedAt)
    expect(createReleaseUndoUntil(now)).toBe(undoUntil)
    expect(new Date(createReleaseUndoUntil(now)).getTime() - now.getTime()).toBe(RELEASE_UNDO_MS)
  })

  it('creates a pending-origin tombstone before clearing the pending receipt projection', () => {
    const projection = createReleaseProjection({
      pendingReceipt: receipt,
      privateArchive: [],
      receiptDispositions: [],
      receipt,
      origin: { kind: 'pending' },
      undoUntil,
    })

    expect(projection).toMatchObject({
      pendingReceipt: null,
      privateArchive: [],
      pendingRelease: {
        receipt,
        undoUntil,
        origin: { kind: 'pending' },
        previousDisposition: null,
      },
      receiptDispositions: [{
        receiptNumber: receipt.receiptNumber,
        disposition: 'released',
        decidedAt,
      }],
    })
  })

  it('removes only the exact archived source and preserves its Undo origin', () => {
    const source: ArchivedReceipt = {
      receipt,
      archivedAt: '2026-07-19T10:00:00.000Z',
    }
    const other: ArchivedReceipt = {
      receipt: createCompletedReceiptSnapshot({
        ...receipt,
        receiptNumber: 'BD-20-OTHER',
        theme: getTheme('original'),
      }),
      archivedAt: '2026-07-18T10:00:00.000Z',
    }
    const projection = createReleaseProjection({
      pendingReceipt: null,
      privateArchive: [source, other],
      receiptDispositions: [kept],
      receipt,
      origin: { kind: 'archive', archivedAt: source.archivedAt },
      undoUntil,
    })

    expect(projection?.privateArchive).toEqual([other])
    expect(projection?.pendingRelease.origin).toEqual({ kind: 'archive', archivedAt: source.archivedAt })
    expect(projection?.pendingRelease.previousDisposition).toEqual(kept)
  })

  it('rejects a release when the requested source is not present', () => {
    expect(createReleaseProjection({
      pendingReceipt: null,
      privateArchive: [],
      receiptDispositions: [],
      receipt,
      origin: { kind: 'pending' },
      undoUntil,
    })).toBeNull()
  })

  it('restores the exact pending receipt and previous disposition during Undo', () => {
    const released = createReleaseProjection({
      pendingReceipt: receipt,
      privateArchive: [],
      receiptDispositions: [kept],
      receipt,
      origin: { kind: 'pending' },
      undoUntil,
    })
    const restored = createUndoReleaseProjection({
      pendingReceipt: released?.pendingReceipt ?? null,
      pendingRelease: released?.pendingRelease ?? null,
      privateArchive: released?.privateArchive ?? [],
      receiptDispositions: released?.receiptDispositions ?? [],
      now: new Date('2026-07-20T12:05:04.000Z'),
    })

    expect(restored?.pendingReceipt).toBe(receipt)
    expect(restored?.pendingRelease).toBeNull()
    expect(restored?.receiptDispositions).toEqual([kept])
  })

  it('restores an archived receipt with its original archivedAt', () => {
    const archivedAt = '2026-07-19T10:00:00.000Z'
    const released = createReleaseProjection({
      pendingReceipt: null,
      privateArchive: [{ receipt, archivedAt }],
      receiptDispositions: [kept],
      receipt,
      origin: { kind: 'archive', archivedAt },
      undoUntil,
    })
    const restored = createUndoReleaseProjection({
      pendingReceipt: null,
      pendingRelease: released?.pendingRelease ?? null,
      privateArchive: released?.privateArchive ?? [],
      receiptDispositions: released?.receiptDispositions ?? [],
      now: new Date('2026-07-20T12:05:04.000Z'),
    })

    expect(restored?.privateArchive).toEqual([{ receipt, archivedAt }])
    expect(restored?.receiptDispositions).toEqual([kept])
  })

  it('prevents Undo after the absolute deadline and finalizes only expired tombstones', () => {
    const released = createReleaseProjection({
      pendingReceipt: receipt,
      privateArchive: [],
      receiptDispositions: [],
      receipt,
      origin: { kind: 'pending' },
      undoUntil,
    })
    const tombstone = released?.pendingRelease
    if (!tombstone) throw new Error('MISSING_TOMBSTONE')

    expect(isReleaseUndoAvailable(tombstone, new Date('2026-07-20T12:05:07.999Z'))).toBe(true)
    expect(isReleaseUndoAvailable(tombstone, new Date(undoUntil))).toBe(false)
    expect(createUndoReleaseProjection({
      pendingReceipt: null,
      pendingRelease: tombstone,
      privateArchive: [],
      receiptDispositions: released?.receiptDispositions ?? [],
      now: new Date(undoUntil),
    })).toBeNull()
    expect(createExpiredReleaseProjection({
      pendingRelease: tombstone,
      now: new Date(undoUntil),
    })).toEqual({ pendingRelease: null })
  })

  it('keeps task and source context outside the tombstone contract', () => {
    const projection = createReleaseProjection({
      pendingReceipt: receipt,
      privateArchive: [],
      receiptDispositions: [],
      receipt,
      origin: { kind: 'pending' },
      undoUntil,
    })
    const serialized = JSON.stringify(projection)
    expect(serialized).not.toContain('sourceText')
    expect(serialized).not.toContain('composeDrafts')
    expect(serialized).not.toContain('evidenceQuote')
  })
})
