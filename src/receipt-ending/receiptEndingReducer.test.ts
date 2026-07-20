import { describe, expect, it } from 'vitest'
import { getTheme } from '../themes'
import { createCompletedReceiptSnapshot } from './completedReceipt'
import { receiptEndingReducer } from './receiptEndingReducer'
import type {
  ReceiptEndingMachineState,
  ReceiptEndingState,
} from './receiptEndingTypes'

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

function settling(): ReceiptEndingState {
  return { kind: 'settling', receipt }
}

function reduce(state: ReceiptEndingMachineState, event: Parameters<typeof receiptEndingReducer>[1]) {
  return receiptEndingReducer(state, event)
}

describe('receiptEndingReducer', () => {
  it('starts a newly printed receipt in settling', () => {
    expect(reduce(null, { type: 'START_NEW_RECEIPT', receipt })).toEqual({
      kind: 'settling',
      receipt,
    })
  })

  it('restores a persisted receipt directly to documented', () => {
    expect(reduce(null, { type: 'RESTORE_RECEIPT', receipt })).toEqual({
      kind: 'documented',
      receipt,
    })
  })

  it('settles exactly once and ignores choices before settling', () => {
    const state = settling()
    expect(reduce(state, { type: 'SELECT_END_HERE' })).toBe(state)
    expect(reduce(state, { type: 'SELECT_CARRY_FORWARD' })).toBe(state)

    const complete = reduce(state, { type: 'PRINT_COMPLETION_SETTLED' })
    expect(complete).toEqual({ kind: 'documented', receipt })
    expect(reduce(complete, { type: 'PRINT_COMPLETION_SETTLED' })).toBe(complete)
  })

  it('moves through all legal shared choices without replacing receipt identity', () => {
    const endChoice = reduce(documented(), { type: 'SELECT_END_HERE' })
    const keep = reduce(endChoice, { type: 'SELECT_KEEP' })
    const release = reduce(endChoice, { type: 'SELECT_RELEASE' })
    const carry = reduce(documented(), { type: 'SELECT_CARRY_FORWARD' })

    expect(endChoice?.kind).toBe('end-choice')
    expect(keep?.kind).toBe('keep-selected')
    expect(release?.kind).toBe('release-selected')
    expect(carry?.kind).toBe('carry-selected')
    expect(keep?.receipt).toBe(receipt)
    expect(release?.receipt).toBe(receipt)
    expect(carry?.receipt).toBe(receipt)
  })

  it('returns each branch to the correct shared decision without replaying settling', () => {
    const endChoice = reduce(documented(), { type: 'SELECT_END_HERE' })
    const keep = reduce(endChoice, { type: 'SELECT_KEEP' })
    const release = reduce(endChoice, { type: 'SELECT_RELEASE' })
    const carry = reduce(documented(), { type: 'SELECT_CARRY_FORWARD' })

    expect(reduce(keep, { type: 'BACK_TO_DISPOSITION' })?.kind).toBe('end-choice')
    expect(reduce(release, { type: 'BACK_TO_DISPOSITION' })?.kind).toBe('end-choice')
    expect(reduce(carry, { type: 'BACK_TO_DOCUMENTED' })?.kind).toBe('documented')
    expect(reduce(endChoice, { type: 'BACK_TO_DOCUMENTED' })?.kind).toBe('documented')
  })

  it('ignores impossible and duplicate events deterministically', () => {
    const state = documented()
    expect(reduce(state, { type: 'SELECT_KEEP' })).toBe(state)
    expect(reduce(state, { type: 'BACK_TO_DISPOSITION' })).toBe(state)
    expect(reduce(state, { type: 'RESTORE_RECEIPT', receipt })).toBe(state)
  })

  it('recovers to the same documented receipt', () => {
    const failed = reduce(documented(), {
      type: 'FAIL',
      reason: 'persistence-unavailable',
    })
    const recovered = reduce(failed, { type: 'RECOVER' })

    expect(failed?.kind).toBe('recovery')
    expect(recovered).toEqual({ kind: 'documented', receipt })
    expect(recovered?.receipt).toBe(receipt)
  })

  it('clears the complete ending domain explicitly', () => {
    expect(reduce(documented(), { type: 'CLEAR_RECEIPT_ENDING' })).toBeNull()
    expect(reduce(null, { type: 'SELECT_END_HERE' })).toBeNull()
  })
})
