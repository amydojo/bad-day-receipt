export type ReceiptEndingHistoryState = 'documented' | 'end-choice' | 'carry-selected'

const HISTORY_KEY = 'badDayReceiptEnding'

export function readReceiptEndingHistory(value: unknown): ReceiptEndingHistoryState | null {
  if (!value || typeof value !== 'object') return null
  const state = (value as Record<string, unknown>)[HISTORY_KEY]
  return state === 'documented' || state === 'end-choice' || state === 'carry-selected'
    ? state
    : null
}

export function replaceReceiptEndingHistory(
  history: Pick<History, 'replaceState' | 'state'>,
  state: ReceiptEndingHistoryState,
) {
  history.replaceState({ ...(history.state ?? {}), [HISTORY_KEY]: state }, '')
}

export function pushReceiptEndingHistory(
  history: Pick<History, 'pushState' | 'state'>,
  state: Exclude<ReceiptEndingHistoryState, 'documented'>,
) {
  history.pushState({ ...(history.state ?? {}), [HISTORY_KEY]: state }, '')
}
