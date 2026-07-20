import { describe, expect, it } from 'vitest'
import { getTheme } from '../themes'
import { createCompletedReceiptSnapshot } from './completedReceipt'
import { receiptEndingReducer } from './receiptEndingReducer'
import type {
  ReceiptEndingEvent,
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

function reduce(state: ReceiptEndingMachineState, event: ReceiptEndingEvent) {
  return receiptEndingReducer(state, event)
}

function startKeep(): Extract<ReceiptEndingState, { kind: 'keep-ritual' }> {
  const endChoice = reduce(documented(), { type: 'SELECT_END_HERE' })
  const keep = reduce(endChoice, { type: 'SELECT_KEEP' })
  if (!keep || keep.kind !== 'keep-ritual') throw new Error('KEEP_DID_NOT_START')
  return keep
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

  it('starts Keep directly at the clean-cut phase without replacing receipt identity', () => {
    const keep = startKeep()

    expect(keep).toMatchObject({
      kind: 'keep-ritual',
      phase: 'cut',
      archiveAttempt: 1,
    })
    expect(keep.receipt).toBe(receipt)
  })

  it('accepts only the legal Keep phase sequence', () => {
    const sequence: Array<[ReceiptEndingEvent, string]> = [
      [{ type: 'KEEP_CUT_COMPLETED' }, 'align'],
      [{ type: 'KEEP_ALIGNMENT_COMPLETED' }, 'sleeve-rising'],
      [{ type: 'KEEP_SLEEVE_RAISED' }, 'sleeve-receiving'],
      [{ type: 'KEEP_RECEIPT_SLEEVED' }, 'label-registering'],
      [{ type: 'KEEP_LABEL_REGISTERED' }, 'archive-opening'],
      [{ type: 'KEEP_ARCHIVE_OPENED' }, 'archiving'],
      [{ type: 'KEEP_RECEIPT_INSERTED' }, 'archive-closing'],
    ]

    let state: ReceiptEndingMachineState = startKeep()
    for (const [event, phase] of sequence) {
      const previous = state
      state = reduce(state, event)
      expect(state?.kind).toBe('keep-ritual')
      expect(state && 'phase' in state ? state.phase : null).toBe(phase)
      expect(state?.receipt).toBe(receipt)
      expect(reduce(previous, sequence.at(-1)![0])).toBe(previous)
    }
  })

  it('does not equate visual closure with archive completion', () => {
    let state: ReceiptEndingMachineState = startKeep()
    const sequence: ReceiptEndingEvent[] = [
      { type: 'KEEP_CUT_COMPLETED' },
      { type: 'KEEP_ALIGNMENT_COMPLETED' },
      { type: 'KEEP_SLEEVE_RAISED' },
      { type: 'KEEP_RECEIPT_SLEEVED' },
      { type: 'KEEP_LABEL_REGISTERED' },
      { type: 'KEEP_ARCHIVE_OPENED' },
      { type: 'KEEP_RECEIPT_INSERTED' },
    ]
    for (const event of sequence) state = reduce(state, event)

    expect(state?.kind).toBe('keep-ritual')
    expect(state && 'phase' in state ? state.phase : null).toBe('archive-closing')
    expect(reduce(state, { type: 'KEEP_ARCHIVE_COMMITTED' })).toBe(state)

    const closed = reduce(state, {
      type: 'KEEP_ARCHIVE_CLOSED',
      archivedAt: '2026-07-20T12:05:00.000Z',
    })
    expect(closed).toMatchObject({
      kind: 'keep-ritual',
      phase: 'archive-closing',
      archivedAt: '2026-07-20T12:05:00.000Z',
    })

    const completed = reduce(closed, { type: 'KEEP_ARCHIVE_COMMITTED' })
    expect(completed).toMatchObject({ kind: 'keep-ritual', phase: 'complete' })
    expect(completed?.receipt).toBe(receipt)
  })

  it('enters dignified Keep recovery only after an attempted archive commit', () => {
    let state: ReceiptEndingMachineState = {
      ...startKeep(),
      phase: 'archive-closing',
      archivedAt: '2026-07-20T12:05:00.000Z',
    }

    state = reduce(state, {
      type: 'KEEP_ARCHIVE_FAILED',
      reason: 'storage-write-failed',
    })

    expect(state).toEqual({
      kind: 'keep-recovery',
      receipt,
      reason: 'storage-write-failed',
      archiveAttempt: 1,
    })
    expect(state?.receipt).toBe(receipt)
  })

  it('retries persistence without replaying the physical ritual or replacing receipt identity', () => {
    const recovery: ReceiptEndingState = {
      kind: 'keep-recovery',
      receipt,
      reason: 'storage-unavailable',
      archiveAttempt: 2,
    }
    const retry = reduce(recovery, {
      type: 'RETRY_KEEP_ARCHIVE',
      archivedAt: '2026-07-20T12:10:00.000Z',
    })

    expect(retry).toEqual({
      kind: 'keep-ritual',
      receipt,
      phase: 'archive-closing',
      archiveAttempt: 3,
      archivedAt: '2026-07-20T12:10:00.000Z',
    })
    expect(retry?.receipt).toBe(receipt)
  })

  it('returns from Keep recovery to the documented receipt unchanged', () => {
    const recovery: ReceiptEndingState = {
      kind: 'keep-recovery',
      receipt,
      reason: 'storage-write-failed',
      archiveAttempt: 1,
    }
    const restored = reduce(recovery, { type: 'RETURN_TO_DOCUMENTED' })

    expect(restored).toEqual({ kind: 'documented', receipt })
    expect(restored?.receipt).toBe(receipt)
  })

  it('closes only a truthfully completed Keep ending', () => {
    const completed: ReceiptEndingState = {
      ...startKeep(),
      phase: 'complete',
      archivedAt: '2026-07-20T12:05:00.000Z',
    }
    expect(reduce(completed, { type: 'CLOSE_KEEP_COMPLETION' })).toBeNull()
    expect(reduce(startKeep(), { type: 'CLOSE_KEEP_COMPLETION' })).not.toBeNull()
  })

  it('preserves Release and Carry Forward shared transitions', () => {
    const endChoice = reduce(documented(), { type: 'SELECT_END_HERE' })
    const release = reduce(endChoice, { type: 'SELECT_RELEASE' })
    const carry = reduce(documented(), { type: 'SELECT_CARRY_FORWARD' })

    expect(release?.kind).toBe('release-selected')
    expect(carry?.kind).toBe('carry-selected')
    expect(release?.receipt).toBe(receipt)
    expect(carry?.receipt).toBe(receipt)
    expect(reduce(release, { type: 'BACK_TO_DISPOSITION' })?.kind).toBe('end-choice')
    expect(reduce(carry, { type: 'BACK_TO_DOCUMENTED' })?.kind).toBe('documented')
  })

  it('ignores impossible, duplicate, and malformed Keep events deterministically', () => {
    const state = startKeep()
    expect(reduce(state, { type: 'KEEP_ALIGNMENT_COMPLETED' })).toBe(state)
    expect(reduce(state, { type: 'KEEP_ARCHIVE_CLOSED', archivedAt: 'invalid' })).toBe(state)
    expect(reduce(documented(), { type: 'SELECT_KEEP' })).toBe(documented())
  })

  it('recovers generic ending failures to the same documented receipt', () => {
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
