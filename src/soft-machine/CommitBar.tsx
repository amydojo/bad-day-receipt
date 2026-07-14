import type { CommitBarProps } from './types'

export function CommitBar({
  itemCount,
  totalLabel,
  actionLabel,
  disabled = false,
  hidden = false,
  onCommit,
}: CommitBarProps) {
  return (
    <div className="soft-machine-commit-bar" data-hidden={hidden} data-testid="mobile-commit-bar">
      <div className="soft-machine-commit-summary" aria-live="polite">
        <span>ITEMS {String(itemCount).padStart(2, '0')}</span>
        <strong>{totalLabel}</strong>
      </div>
      <button type="button" disabled={disabled} onClick={onCommit} data-testid="mobile-commit">
        {actionLabel}
      </button>
    </div>
  )
}
