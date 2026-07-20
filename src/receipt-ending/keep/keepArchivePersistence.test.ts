import { describe, expect, it } from 'vitest'
import { getTheme } from '../../themes'
import { createCompletedReceiptSnapshot } from '../completedReceipt'
import type { ArchivedReceipt, ReceiptDisposition } from '../receiptEndingTypes'
import {
  appendArchivedReceipt,
  appendReceiptDisposition,
  createKeepArchiveProjection,
} from './keepArchivePersistence'

function makeReceipt(receiptNumber: string, completedAt = '2026-07-20T12:00:00.000Z') {
  return createCompletedReceiptSnapshot({
    receiptNumber,
    completedAt,
    theme: getTheme('original'),
    items: [{ id: receiptNumber, label: `Receipt ${receiptNumber}`, amount: 12, kind: 'charge', quantity: 1 }],
    total: 12.96,
    itemCount: 1,
    status: 'documented',
    anomaly: null,
    shareCopy: `Receipt ${receiptNumber}`,
  })
}

describe('Keep archive persistence projection', () => {
  it('appends the full frozen snapshot newest-first without changing completedAt', () => {
    const receipt = makeReceipt('BD-20-0101')
    const archivedAt = '2026-07-20T12:05:00.000Z'
    const archive = appendArchivedReceipt([], receipt, archivedAt)

    expect(archive).toEqual([{ receipt, archivedAt }])
    expect(archive[0].receipt).toEqual(receipt)
    expect(archive[0].receipt.completedAt).toBe('2026-07-20T12:00:00.000Z')
    expect(Object.isFrozen(receipt)).toBe(true)
  })

  it('deduplicates by receipt number and replaces the prior archive timestamp', () => {
    const receipt = makeReceipt('BD-20-0102')
    const original: ArchivedReceipt[] = [{
      receipt,
      archivedAt: '2026-07-20T12:05:00.000Z',
    }]

    const next = appendArchivedReceipt(
      original,
      receipt,
      '2026-07-20T12:10:00.000Z',
    )

    expect(next).toHaveLength(1)
    expect(next[0].archivedAt).toBe('2026-07-20T12:10:00.000Z')
  })

  it('caps the private archive at five entries', () => {
    const existing: ArchivedReceipt[] = Array.from({ length: 5 }, (_, index) => ({
      receipt: makeReceipt(`BD-20-02${index}`),
      archivedAt: `2026-07-20T12:0${index}:00.000Z`,
    }))
    const newest = makeReceipt('BD-20-0999')

    const next = appendArchivedReceipt(
      existing,
      newest,
      '2026-07-20T13:00:00.000Z',
    )

    expect(next).toHaveLength(5)
    expect(next[0].receipt.receiptNumber).toBe('BD-20-0999')
    expect(next.some((entry) => entry.receipt.receiptNumber === 'BD-20-024')).toBe(false)
  })

  it('records one kept disposition and remains idempotent', () => {
    const current: ReceiptDisposition[] = []
    const first = appendReceiptDisposition(
      current,
      'BD-20-0103',
      '2026-07-20T12:05:00.000Z',
    )
    const repeated = appendReceiptDisposition(
      first,
      'BD-20-0103',
      '2026-07-20T12:05:00.000Z',
    )

    expect(repeated).toEqual(first)
    expect(repeated).toHaveLength(1)
    expect(repeated[0]).toEqual({
      receiptNumber: 'BD-20-0103',
      disposition: 'kept',
      decidedAt: '2026-07-20T12:05:00.000Z',
    })
  })

  it('clears pending receipt only in a valid matching projection', () => {
    const receipt = makeReceipt('BD-20-0104')
    const projection = createKeepArchiveProjection({
      currentArchive: [],
      currentDispositions: [],
      pendingReceipt: receipt,
      receipt,
      archivedAt: '2026-07-20T12:05:00.000Z',
    })

    expect(projection).not.toBeNull()
    expect(projection?.pendingReceipt).toBeNull()
    expect(projection?.privateArchive[0].receipt).toEqual(receipt)
    expect(projection?.receiptDispositions[0].disposition).toBe('kept')
  })

  it('rejects mismatched pending receipt and invalid timestamps without mutation', () => {
    const receipt = makeReceipt('BD-20-0105')
    const other = makeReceipt('BD-20-0106')

    expect(createKeepArchiveProjection({
      currentArchive: [],
      currentDispositions: [],
      pendingReceipt: other,
      receipt,
      archivedAt: '2026-07-20T12:05:00.000Z',
    })).toBeNull()

    expect(createKeepArchiveProjection({
      currentArchive: [],
      currentDispositions: [],
      pendingReceipt: receipt,
      receipt,
      archivedAt: 'not-a-date',
    })).toBeNull()
  })

  it('does not introduce Carry Forward task or evidence context into the archive projection', () => {
    const receipt = makeReceipt('BD-20-0107')
    const projection = createKeepArchiveProjection({
      currentArchive: [],
      currentDispositions: [],
      pendingReceipt: receipt,
      receipt,
      archivedAt: '2026-07-20T12:05:00.000Z',
    })
    const serialized = JSON.stringify(projection)

    expect(serialized).not.toContain('remainingObligation')
    expect(serialized).not.toContain('generatedDraft')
    expect(serialized).not.toContain('evidenceQuotes')
    expect(serialized).not.toContain('sourceText')
  })
})
