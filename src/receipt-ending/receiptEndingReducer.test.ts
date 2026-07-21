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

function reduce(state: ReceiptEndingMachineState, event: ReceiptEndingEvent) {
  return receiptEndingReducer(state, event)
}

function startKeep(): Extract<ReceiptEndingState, { kind: 'keep-ritual' }> {
  const endChoice = reduce(documented(), { type: 'SELECT_END_HERE' })
  const keep = reduce(endChoice, { type: 'SELECT_KEEP' })
  if (!keep || keep.kind !== 'keep-ritual') throw new Error('KEEP_DID_NOT_START')
  return keep
}

function startRelease(): Extract<ReceiptEndingState, { kind: 'release-ritual' }> {
  const endChoice = reduce(documented(), { type: 'SELECT_END_HERE' })
  const release = reduce(endChoice, { type: 'SELECT_RELEASE' })
  if (!release || release.kind !== 'release-ritual') throw new Error('RELEASE_DID_NOT_START')
  return release
}

describe('receiptEndingReducer', () => {
  it('starts new receipts in settling and restores persisted receipts directly to documented', () => {
    expect(reduce(null, { type: 'START_NEW_RECEIPT', receipt })).toEqual({ kind: 'settling', receipt })
    expect(reduce(null, { type: 'RESTORE_RECEIPT', receipt })).toEqual({ kind: 'documented', receipt })
  })

  it('settles exactly once and ignores choices before settling', () => {
    const state: ReceiptEndingState = { kind: 'settling', receipt }
    expect(reduce(state, { type: 'SELECT_END_HERE' })).toBe(state)
    const complete = reduce(state, { type: 'PRINT_COMPLETION_SETTLED' })
    expect(complete).toEqual({ kind: 'documented', receipt })
    expect(reduce(complete, { type: 'PRINT_COMPLETION_SETTLED' })).toBe(complete)
  })

  it('runs the exact Keep sequence without replacing receipt identity', () => {
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
      state = reduce(state, event)
      expect(state?.kind).toBe('keep-ritual')
      expect(state && 'phase' in state ? state.phase : null).toBe(phase)
      expect(state?.receipt).toBe(receipt)
    }
  })

  it('does not equate visual Keep closure with persistence completion', () => {
    const state: ReceiptEndingState = {
      ...startKeep(),
      phase: 'archive-closing',
    }
    expect(reduce(state, { type: 'KEEP_ARCHIVE_COMMITTED' })).toBe(state)
    const closed = reduce(state, {
      type: 'KEEP_ARCHIVE_CLOSED',
      archivedAt: '2026-07-20T12:05:00.000Z',
    })
    const completed = reduce(closed, { type: 'KEEP_ARCHIVE_COMMITTED' })
    expect(completed).toMatchObject({ kind: 'keep-ritual', phase: 'complete' })
  })

  it('retries failed Keep persistence without replaying choreography', () => {
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
  })

  it('starts Release at clean cut with pending origin', () => {
    const state = startRelease()
    expect(state).toMatchObject({
      kind: 'release-ritual',
      phase: 'cut',
      releaseAttempt: 1,
      origin: { kind: 'pending' },
    })
    expect(state.receipt).toBe(receipt)
  })

  it('accepts the exact Release order including explicit corner hold', () => {
    const sequence: Array<[ReceiptEndingEvent, string]> = [
      [{ type: 'RELEASE_CUT_COMPLETED' }, 'unprint-total'],
      [{ type: 'RELEASE_TOTAL_UNPRINTED' }, 'unprint-lines'],
      [{ type: 'RELEASE_LINES_UNPRINTED' }, 'unprint-receipt-number'],
      [{ type: 'RELEASE_NUMBER_UNPRINTED' }, 'unprint-acknowledgment'],
      [{ type: 'RELEASE_ACKNOWLEDGMENT_UNPRINTED' }, 'soften'],
      [{ type: 'RELEASE_PAPER_SOFTENED' }, 'slot-opening'],
      [{ type: 'RELEASE_SLOT_OPENED' }, 'receiving'],
      [{ type: 'RELEASE_RECEIPT_RECEIVED' }, 'corner-hold'],
      [{ type: 'RELEASE_CORNER_HOLD_COMPLETED' }, 'slot-closing'],
    ]
    let state: ReceiptEndingMachineState = startRelease()
    for (const [event, phase] of sequence) {
      state = reduce(state, event)
      expect(state?.kind).toBe('release-ritual')
      expect(state && 'phase' in state ? state.phase : null).toBe(phase)
      expect(state?.receipt).toBe(receipt)
    }
  })

  it('requires an absolute tombstone deadline before Release commit can begin', () => {
    const state: ReceiptEndingState = {
      ...startRelease(),
      phase: 'slot-closing',
    }
    expect(reduce(state, { type: 'RELEASE_COMMITTED' })).toBe(state)
    expect(reduce(state, { type: 'RELEASE_SLOT_CLOSED', undoUntil: 'invalid' })).toBe(state)
    const committing = reduce(state, {
      type: 'RELEASE_SLOT_CLOSED',
      undoUntil: '2026-07-20T12:05:08.000Z',
    })
    expect(committing).toMatchObject({
      kind: 'release-ritual',
      phase: 'committing',
      undoUntil: '2026-07-20T12:05:08.000Z',
    })
    expect(reduce(committing, { type: 'RELEASE_COMMITTED' })).toMatchObject({
      kind: 'release-ritual',
      phase: 'complete',
    })
  })

  it('restores a persisted tombstone directly to released completion', () => {
    const restored = reduce(null, {
      type: 'RESTORE_RELEASE',
      pendingRelease: {
        receipt,
        undoUntil: '2026-07-20T12:05:08.000Z',
        origin: { kind: 'archive', archivedAt: '2026-07-19T10:00:00.000Z' },
        previousDisposition: null,
      },
    })
    expect(restored).toMatchObject({
      kind: 'release-ritual',
      phase: 'complete',
      origin: { kind: 'archive' },
    })
  })

  it('separates failed Release recovery from failed Undo recovery', () => {
    const releaseRecovery = reduce({
      ...startRelease(),
      phase: 'committing',
      undoUntil: '2026-07-20T12:05:08.000Z',
    }, { type: 'RELEASE_FAILED', reason: 'storage-write-failed' })
    expect(releaseRecovery).toMatchObject({ kind: 'release-recovery', operation: 'release' })

    const undoRecovery = reduce({
      ...startRelease(),
      phase: 'undoing',
      undoUntil: '2026-07-20T12:05:08.000Z',
    }, { type: 'UNDO_RELEASE_FAILED', reason: 'storage-write-failed' })
    expect(undoRecovery).toMatchObject({
      kind: 'release-recovery',
      operation: 'undo',
      undoUntil: '2026-07-20T12:05:08.000Z',
    })
    expect(reduce(undoRecovery, { type: 'RETURN_TO_RELEASED_COMPLETION' })).toMatchObject({
      kind: 'release-ritual',
      phase: 'complete',
    })
  })

  it('keeps expired Release finalization persistence-bound and retryable', () => {
    const completed: ReceiptEndingState = {
      ...startRelease(),
      phase: 'complete',
      undoUntil: '2026-07-20T12:05:08.000Z',
    }
    const recovery = reduce(completed, {
      type: 'RELEASE_EXPIRY_FAILED',
      reason: 'storage-write-failed',
    })
    expect(recovery).toMatchObject({
      kind: 'release-recovery',
      operation: 'expiry',
      undoUntil: '2026-07-20T12:05:08.000Z',
    })
    expect(reduce(recovery, { type: 'RETRY_RELEASE_EXPIRY' })).toMatchObject({
      kind: 'release-ritual',
      phase: 'complete',
      undoUntil: '2026-07-20T12:05:08.000Z',
    })
    expect(reduce(completed, { type: 'RELEASE_UNDO_EXPIRED' })).toBeNull()
  })

  it('returns exact pending Undo to documented and archive Undo out of the active machine', () => {
    const pendingUndo: ReceiptEndingState = {
      ...startRelease(),
      phase: 'undoing',
      undoUntil: '2026-07-20T12:05:08.000Z',
    }
    expect(reduce(pendingUndo, {
      type: 'UNDO_RELEASE_COMMITTED',
      destination: 'documented',
    })).toEqual({ kind: 'documented', receipt })
    expect(reduce(pendingUndo, {
      type: 'UNDO_RELEASE_COMMITTED',
      destination: 'archive',
    })).toBeNull()
  })

  it('preserves Carry Forward shared transition and ignores impossible events', () => {
    const carry = reduce(documented(), { type: 'SELECT_CARRY_FORWARD' })
    expect(carry?.kind).toBe('carry-selected')
    expect(carry?.receipt).toBe(receipt)
    expect(reduce(carry, { type: 'BACK_TO_DOCUMENTED' })?.kind).toBe('documented')
    const release = startRelease()
    expect(reduce(release, { type: 'RELEASE_LINES_UNPRINTED' })).toBe(release)
  })

  it('recovers generic failures and clears the domain explicitly', () => {
    const failed = reduce(documented(), { type: 'FAIL', reason: 'persistence-unavailable' })
    expect(reduce(failed, { type: 'RECOVER' })).toEqual({ kind: 'documented', receipt })
    expect(reduce(documented(), { type: 'CLEAR_RECEIPT_ENDING' })).toBeNull()
    expect(reduce(null, { type: 'SELECT_END_HERE' })).toBeNull()
  })
})
