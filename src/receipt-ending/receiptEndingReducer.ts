import type {
  ReceiptEndingEvent,
  ReceiptEndingState,
} from './receiptEndingTypes'

export function receiptEndingReducer(
  state: ReceiptEndingState,
  event: ReceiptEndingEvent,
): ReceiptEndingState {
  if (event.type === 'FAIL') {
    if (state.kind === 'recovery' && state.reason === event.reason) return state
    return { kind: 'recovery', receipt: state.receipt, reason: event.reason }
  }

  if (event.type === 'RECOVER') {
    return state.kind === 'recovery'
      ? { kind: 'documented', receipt: state.receipt }
      : state
  }

  switch (state.kind) {
    case 'documented':
      if (event.type === 'OPEN_END_CHOICE') {
        return { kind: 'end-choice', receipt: state.receipt }
      }
      if (event.type === 'SELECT_CARRY') {
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
      if (event.type === 'BACK') {
        return { kind: 'documented', receipt: state.receipt }
      }
      return state

    case 'keep-selected':
    case 'release-selected':
      return event.type === 'BACK'
        ? { kind: 'end-choice', receipt: state.receipt }
        : state

    case 'carry-selected':
      return event.type === 'BACK'
        ? { kind: 'documented', receipt: state.receipt }
        : state

    case 'recovery':
      return state
  }
}
