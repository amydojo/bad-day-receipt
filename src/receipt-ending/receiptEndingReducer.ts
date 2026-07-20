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
): ReceiptEndingState {
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
        return { kind: 'keep-selected', receipt: state.receipt }
      }
      if (event.type === 'SELECT_RELEASE') {
        return { kind: 'release-selected', receipt: state.receipt }
      }
      if (event.type === 'BACK_TO_DOCUMENTED') {
        return { kind: 'documented', receipt: state.receipt }
      }
      return state

    case 'keep-selected':
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
