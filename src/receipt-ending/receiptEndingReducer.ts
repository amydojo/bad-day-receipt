import type {
  ReceiptEndingEvent,
  ReceiptEndingMachineState,
  ReceiptEndingState,
} from './receiptEndingTypes'

export function receiptEndingReducer(
  state: ReceiptEndingMachineState,
  event: ReceiptEndingEvent,
): ReceiptEndingMachineState {
  if (event.type === 'START_NEW_RECEIPT') {
    if (state?.receipt.receiptNumber === event.receipt.receiptNumber) return state
    return { kind: 'settling', receipt: event.receipt }
  }

  if (event.type === 'RESTORE_RECEIPT') {
    if (state?.receipt.receiptNumber === event.receipt.receiptNumber) return state
    return { kind: 'documented', receipt: event.receipt }
  }

  if (event.type === 'RESTORE_RELEASE') {
    return {
      kind: 'release-ritual',
      receipt: event.pendingRelease.receipt,
      phase: 'complete',
      releaseAttempt: 1,
      origin: event.pendingRelease.origin,
      undoUntil: event.pendingRelease.undoUntil,
    }
  }

  if (event.type === 'START_ARCHIVED_RELEASE') {
    return {
      kind: 'release-ritual',
      receipt: event.receipt,
      phase: 'cut',
      releaseAttempt: 1,
      origin: { kind: 'archive', archivedAt: event.archivedAt },
    }
  }

  if (event.type === 'CLEAR_RECEIPT_ENDING') return null
  if (!state) return null

  if (event.type === 'FAIL') {
    if (state.kind === 'recovery' && state.reason === event.reason) return state
    return { kind: 'recovery', receipt: state.receipt, reason: event.reason }
  }

  if (event.type === 'RECOVER') {
    return state.kind === 'recovery'
      ? { kind: 'documented', receipt: state.receipt }
      : state
  }

  return transitionActiveState(state, event)
}

function transitionActiveState(
  state: ReceiptEndingState,
  event: ReceiptEndingEvent,
): ReceiptEndingMachineState {
  switch (state.kind) {
    case 'settling':
      return event.type === 'PRINT_COMPLETION_SETTLED'
        ? { kind: 'documented', receipt: state.receipt }
        : state

    case 'documented':
      if (event.type === 'SELECT_END_HERE') return { kind: 'end-choice', receipt: state.receipt }
      if (event.type === 'SELECT_CARRY_FORWARD') return { kind: 'carry-selected', receipt: state.receipt }
      return state

    case 'end-choice':
      if (event.type === 'SELECT_KEEP') {
        return {
          kind: 'keep-ritual',
          receipt: state.receipt,
          phase: 'cut',
          archiveAttempt: 1,
        }
      }
      if (event.type === 'SELECT_RELEASE') {
        return {
          kind: 'release-ritual',
          receipt: state.receipt,
          phase: 'cut',
          releaseAttempt: 1,
          origin: { kind: 'pending' },
        }
      }
      if (event.type === 'BACK_TO_DOCUMENTED') return { kind: 'documented', receipt: state.receipt }
      return state

    case 'keep-ritual':
      return transitionKeepRitual(state, event)

    case 'keep-recovery':
      if (event.type === 'RETRY_KEEP_ARCHIVE' && isIsoDate(event.archivedAt)) {
        return {
          kind: 'keep-ritual',
          receipt: state.receipt,
          phase: 'archive-closing',
          archiveAttempt: state.archiveAttempt + 1,
          archivedAt: event.archivedAt,
        }
      }
      if (event.type === 'RETURN_TO_DOCUMENTED') return { kind: 'documented', receipt: state.receipt }
      return state

    case 'release-ritual':
      return transitionReleaseRitual(state, event)

    case 'release-recovery':
      if (state.operation === 'release'
        && event.type === 'RETRY_RELEASE'
        && isIsoDate(event.undoUntil)) {
        return {
          kind: 'release-ritual',
          receipt: state.receipt,
          phase: 'committing',
          releaseAttempt: state.releaseAttempt + 1,
          origin: state.origin,
          undoUntil: event.undoUntil,
        }
      }
      if (state.operation === 'undo'
        && event.type === 'RETRY_UNDO_RELEASE'
        && state.undoUntil) {
        return {
          kind: 'release-ritual',
          receipt: state.receipt,
          phase: 'undoing',
          releaseAttempt: state.releaseAttempt,
          origin: state.origin,
          undoUntil: state.undoUntil,
        }
      }
      if (state.operation === 'undo'
        && event.type === 'RETURN_TO_RELEASED_COMPLETION'
        && state.undoUntil) {
        return {
          kind: 'release-ritual',
          receipt: state.receipt,
          phase: 'complete',
          releaseAttempt: state.releaseAttempt,
          origin: state.origin,
          undoUntil: state.undoUntil,
        }
      }
      if (state.operation === 'release' && event.type === 'RETURN_TO_DOCUMENTED') {
        return { kind: 'documented', receipt: state.receipt }
      }
      return state

    case 'carry-selected':
      return event.type === 'BACK_TO_DOCUMENTED'
        ? { kind: 'documented', receipt: state.receipt }
        : state

    case 'recovery':
      return state
  }
}

function transitionKeepRitual(
  state: Extract<ReceiptEndingState, { kind: 'keep-ritual' }>,
  event: ReceiptEndingEvent,
): ReceiptEndingMachineState {
  switch (state.phase) {
    case 'cut': return event.type === 'KEEP_CUT_COMPLETED' ? { ...state, phase: 'align' } : state
    case 'align': return event.type === 'KEEP_ALIGNMENT_COMPLETED' ? { ...state, phase: 'sleeve-rising' } : state
    case 'sleeve-rising': return event.type === 'KEEP_SLEEVE_RAISED' ? { ...state, phase: 'sleeve-receiving' } : state
    case 'sleeve-receiving': return event.type === 'KEEP_RECEIPT_SLEEVED' ? { ...state, phase: 'label-registering' } : state
    case 'label-registering': return event.type === 'KEEP_LABEL_REGISTERED' ? { ...state, phase: 'archive-opening' } : state
    case 'archive-opening': return event.type === 'KEEP_ARCHIVE_OPENED' ? { ...state, phase: 'archiving' } : state
    case 'archiving': return event.type === 'KEEP_RECEIPT_INSERTED' ? { ...state, phase: 'archive-closing' } : state
    case 'archive-closing':
      if (event.type === 'KEEP_ARCHIVE_CLOSED') {
        if (state.archivedAt || !isIsoDate(event.archivedAt)) return state
        return { ...state, archivedAt: event.archivedAt }
      }
      if (event.type === 'KEEP_ARCHIVE_COMMITTED' && state.archivedAt) return { ...state, phase: 'complete' }
      if (event.type === 'KEEP_ARCHIVE_FAILED' && state.archivedAt) {
        return {
          kind: 'keep-recovery',
          receipt: state.receipt,
          reason: event.reason,
          archiveAttempt: state.archiveAttempt,
        }
      }
      return state
    case 'complete': return event.type === 'CLOSE_KEEP_COMPLETION' ? null : state
  }
}

function transitionReleaseRitual(
  state: Extract<ReceiptEndingState, { kind: 'release-ritual' }>,
  event: ReceiptEndingEvent,
): ReceiptEndingMachineState {
  switch (state.phase) {
    case 'cut': return event.type === 'RELEASE_CUT_COMPLETED' ? { ...state, phase: 'unprint-total' } : state
    case 'unprint-total': return event.type === 'RELEASE_TOTAL_UNPRINTED' ? { ...state, phase: 'unprint-lines' } : state
    case 'unprint-lines': return event.type === 'RELEASE_LINES_UNPRINTED' ? { ...state, phase: 'unprint-receipt-number' } : state
    case 'unprint-receipt-number': return event.type === 'RELEASE_NUMBER_UNPRINTED' ? { ...state, phase: 'unprint-acknowledgment' } : state
    case 'unprint-acknowledgment': return event.type === 'RELEASE_ACKNOWLEDGMENT_UNPRINTED' ? { ...state, phase: 'soften' } : state
    case 'soften': return event.type === 'RELEASE_PAPER_SOFTENED' ? { ...state, phase: 'slot-opening' } : state
    case 'slot-opening': return event.type === 'RELEASE_SLOT_OPENED' ? { ...state, phase: 'receiving' } : state
    case 'receiving': return event.type === 'RELEASE_RECEIPT_RECEIVED' ? { ...state, phase: 'corner-hold' } : state
    case 'corner-hold': return event.type === 'RELEASE_CORNER_HOLD_COMPLETED' ? { ...state, phase: 'slot-closing' } : state
    case 'slot-closing':
      if (event.type !== 'RELEASE_SLOT_CLOSED' || !isIsoDate(event.undoUntil)) return state
      return { ...state, phase: 'committing', undoUntil: event.undoUntil }
    case 'committing':
      if (event.type === 'RELEASE_COMMITTED' && state.undoUntil) return { ...state, phase: 'complete' }
      if (event.type === 'RELEASE_FAILED') {
        return {
          kind: 'release-recovery',
          receipt: state.receipt,
          reason: event.reason,
          operation: 'release',
          releaseAttempt: state.releaseAttempt,
          origin: state.origin,
        }
      }
      return state
    case 'complete':
      if (event.type === 'UNDO_RELEASE') return { ...state, phase: 'undoing' }
      if (event.type === 'RELEASE_UNDO_EXPIRED' || event.type === 'CLOSE_RELEASE_COMPLETION') return null
      return state
    case 'undoing':
      if (event.type === 'UNDO_RELEASE_COMMITTED') {
        return event.destination === 'documented'
          ? { kind: 'documented', receipt: state.receipt }
          : null
      }
      if (event.type === 'UNDO_RELEASE_FAILED') {
        return {
          kind: 'release-recovery',
          receipt: state.receipt,
          reason: event.reason,
          operation: 'undo',
          releaseAttempt: state.releaseAttempt,
          origin: state.origin,
          undoUntil: state.undoUntil,
        }
      }
      return state
  }
}

function isIsoDate(value: string): boolean {
  return value.length > 0 && !Number.isNaN(Date.parse(value))
}
