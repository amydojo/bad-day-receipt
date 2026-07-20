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
      if (event.type === 'SELECT_END_HERE') {
        return { kind: 'end-choice', receipt: state.receipt }
      }
      if (event.type === 'SELECT_CARRY_FORWARD') {
        return { kind: 'carry-selected', receipt: state.receipt }
      }
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
        return { kind: 'release-selected', receipt: state.receipt }
      }
      if (event.type === 'BACK_TO_DOCUMENTED') {
        return { kind: 'documented', receipt: state.receipt }
      }
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
      if (event.type === 'RETURN_TO_DOCUMENTED') {
        return { kind: 'documented', receipt: state.receipt }
      }
      return state

    case 'release-selected':
      return event.type === 'BACK_TO_DISPOSITION'
        ? { kind: 'end-choice', receipt: state.receipt }
        : state

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
    case 'cut':
      return event.type === 'KEEP_CUT_COMPLETED'
        ? { ...state, phase: 'align' }
        : state

    case 'align':
      return event.type === 'KEEP_ALIGNMENT_COMPLETED'
        ? { ...state, phase: 'sleeve-rising' }
        : state

    case 'sleeve-rising':
      return event.type === 'KEEP_SLEEVE_RAISED'
        ? { ...state, phase: 'sleeve-receiving' }
        : state

    case 'sleeve-receiving':
      return event.type === 'KEEP_RECEIPT_SLEEVED'
        ? { ...state, phase: 'label-registering' }
        : state

    case 'label-registering':
      return event.type === 'KEEP_LABEL_REGISTERED'
        ? { ...state, phase: 'archive-opening' }
        : state

    case 'archive-opening':
      return event.type === 'KEEP_ARCHIVE_OPENED'
        ? { ...state, phase: 'archiving' }
        : state

    case 'archiving':
      return event.type === 'KEEP_RECEIPT_INSERTED'
        ? { ...state, phase: 'archive-closing' }
        : state

    case 'archive-closing':
      if (event.type === 'KEEP_ARCHIVE_CLOSED') {
        if (state.archivedAt || !isIsoDate(event.archivedAt)) return state
        return { ...state, archivedAt: event.archivedAt }
      }
      if (event.type === 'KEEP_ARCHIVE_COMMITTED' && state.archivedAt) {
        return { ...state, phase: 'complete' }
      }
      if (event.type === 'KEEP_ARCHIVE_FAILED' && state.archivedAt) {
        return {
          kind: 'keep-recovery',
          receipt: state.receipt,
          reason: event.reason,
          archiveAttempt: state.archiveAttempt,
        }
      }
      return state

    case 'complete':
      return event.type === 'CLOSE_KEEP_COMPLETION' ? null : state
  }
}

function isIsoDate(value: string): boolean {
  return value.length > 0 && !Number.isNaN(Date.parse(value))
}
