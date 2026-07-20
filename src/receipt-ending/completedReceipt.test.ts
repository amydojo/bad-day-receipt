import { describe, expect, it } from 'vitest'
import { getTheme } from '../themes'
import type { ReceiptItem } from '../types'
import {
  CompletedReceiptSnapshotSchema,
  cloneCompletedReceiptSnapshot,
  createCompletedReceiptSnapshot,
  parseCompletedReceiptSnapshot,
} from './completedReceipt'

const items: ReceiptItem[] = [
  { id: 'normal', label: 'Trying to act normal', amount: 14, kind: 'charge', quantity: 1 },
]

function snapshot() {
  return createCompletedReceiptSnapshot({
    receiptNumber: 'BD-20-0001',
    completedAt: '2026-07-20T12:00:00.000Z',
    theme: getTheme('original'),
    items,
    total: 15.19,
    itemCount: 1,
    status: 'dented but operational',
    anomaly: null,
    shareCopy: 'Local only.',
  })
}

describe('CompletedReceiptSnapshot', () => {
  it('creates a deterministic, runtime-valid snapshot', () => {
    const first = snapshot()
    const second = snapshot()

    expect(first).toEqual(second)
    expect(CompletedReceiptSnapshotSchema.parse(first)).toEqual(first)
  })

  it('deeply detaches and freezes receipt items', () => {
    const completed = snapshot()
    items[0].label = 'Mutated after printing'

    expect(completed.items[0].label).toBe('Trying to act normal')
    expect(Object.isFrozen(completed)).toBe(true)
    expect(Object.isFrozen(completed.items)).toBe(true)
    expect(Object.isFrozen(completed.items[0])).toBe(true)
  })

  it('rejects malformed persisted snapshots', () => {
    expect(parseCompletedReceiptSnapshot({ receiptNumber: 'BD-20-0001' })).toBeNull()
  })

  it('clones without introducing task or source context', () => {
    const cloned = cloneCompletedReceiptSnapshot(snapshot())
    const serialized = JSON.stringify(cloned)

    expect(cloned).toEqual(snapshot())
    expect(serialized).not.toContain('task')
    expect(serialized).not.toContain('source')
    expect(serialized).not.toContain('evidenceQuote')
  })
})
