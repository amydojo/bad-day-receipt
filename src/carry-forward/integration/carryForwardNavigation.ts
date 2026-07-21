export const IN_TREE_CARRY_FORWARD_HISTORY_KEY = 'bad-day-receipt:in-tree-carry-forward'

export type InTreeCarryForwardHistoryStage = 'applying' | 'active' | 'complete' | 'fallback'

export function setInTreeCarryForwardHistoryStage(
  stage: InTreeCarryForwardHistoryStage,
  receiptId: string | null,
) {
  if (typeof window === 'undefined') return
  const existing = window.history.state && typeof window.history.state === 'object'
    ? window.history.state
    : {}
  window.history.replaceState({
    ...existing,
    [IN_TREE_CARRY_FORWARD_HISTORY_KEY]: {
      stage,
      receiptId,
    },
  }, '')
}

export function clearInTreeCarryForwardHistoryStage() {
  if (typeof window === 'undefined') return
  const existing = window.history.state && typeof window.history.state === 'object'
    ? { ...window.history.state }
    : {}
  delete existing[IN_TREE_CARRY_FORWARD_HISTORY_KEY]
  window.history.replaceState(existing, '')
}
