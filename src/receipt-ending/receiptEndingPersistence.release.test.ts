import { describe, expect, it } from 'vitest'
import { getTheme } from '../themes'
import { createCompletedReceiptSnapshot } from './completedReceipt'
import { parsePendingRelease } from './receiptEndingPersistence'

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

describe('pending Release parsing', () => {
  it('defaults a legacy tombstone without origin metadata to pending receipt origin', () => {
    expect(parsePendingRelease({
      receipt,
      undoUntil: '2026-07-20T12:05:08.000Z',
    })).toEqual({
      receipt,
      undoUntil: '2026-07-20T12:05:08.000Z',
      origin: { kind: 'pending' },
      previousDisposition: null,
    })
  })

  it('preserves validated archive origin and previous disposition', () => {
    const value = {
      receipt,
      undoUntil: '2026-07-20T12:05:08.000Z',
      origin: { kind: 'archive', archivedAt: '2026-07-19T10:00:00.000Z' },
      previousDisposition: {
        receiptNumber: receipt.receiptNumber,
        disposition: 'kept',
        decidedAt: '2026-07-19T10:00:00.000Z',
      },
    }
    expect(parsePendingRelease(value)).toEqual(value)
  })

  it('rejects malformed archive origins and explicit malformed disposition data', () => {
    const malformedOrigin = parsePendingRelease({
      receipt,
      undoUntil: '2026-07-20T12:05:08.000Z',
      origin: { kind: 'archive', archivedAt: 'invalid' },
    })
    expect(malformedOrigin?.origin).toEqual({ kind: 'pending' })

    expect(parsePendingRelease({
      receipt,
      undoUntil: '2026-07-20T12:05:08.000Z',
      previousDisposition: { disposition: 'kept' },
    })).toBeNull()
  })
})
