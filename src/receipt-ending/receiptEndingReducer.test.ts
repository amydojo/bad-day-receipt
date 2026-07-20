import { describe, expect, it } from 'vitest'
import { getTheme } from '../themes'
import { createCompletedReceiptSnapshot } from './completedReceipt'
import { receiptEndingReducer } from './receiptEndingReducer'
import type { ReceiptEndingState } from './receiptEndingTypes'

const receipt = createCompletedReceiptSnapshot({
  receiptNumber: 'BD-20-0002',
  completedAt: '2026-07-20T12:00:00.000Z',
  theme: getTheme('original'),
  items: [{ id: 'normal', label: 'Trying to act normal', amount: 14, kind: 'charge', quantity: 1 }],
  total: 15.19,
  itemCount: 1,
  status: 'dented but operational',
  anomaly: null,
  shareCopy: 'Local only.',
})

function documented(): ReceiptEndingState {
  return { kind: 'documented', receipt }
}

describe('receiptEndingReducer', () => {
  it('moves through the legal ending selections without replacing receipt identity', () => {
    const endChoice = receiptEndingReducer(documented(), { type: 'OPEN_END_CHOICE' })
    const keep = receiptEndingReducer(endChoice, { type: 'SELECT_KEEP' })

    expect(endChoice.kind).toBe('end-choice')
    expect(keep.kind).toBe('keep-selected')
    expect(keep.receipt).toBe(receipt)
  })

  it('ignores impossible and duplicate events deterministically', () => {
    const state = documented()
    expect(receiptEndingReducer(state, { type: 'SELECT_KEEP' })).toBe(state)
    expect(receiptEndingReducer(state, { type: 'BACK' })).toBe(state)
  })

  it('recovers to the same documented receipt', () => {
    const failed = receiptEndingReducer(documented(), {
      type: 'FAIL',
      reason: 'persistence-unavailable',
    })
    const recovered = receiptEndingReducer(failed, { type: 'RECOVER' })

    expect(failed.kind).toBe('recovery')
    expect(recovered).toEqual({ kind: 'documented', receipt })
    expect(recovered.receipt).toBe(receipt)
  })

  it('returns Carry Forward to documented and Keep or Release to end choice', () => {
    const carry = receiptEndingReducer(documented(), { type: 'SELECT_CARRY' })
    const keep = receiptEndingReducer(
      { kind: 'end-choice', receipt },
      { type: 'SELECT_KEEP' },
    )

    expect(receiptEndingReducer(carry, { type: 'BACK' }).kind).toBe('documented')
    expect(receiptEndingReducer(keep, { type: 'BACK' }).kind).toBe('end-choice')
  })
})
