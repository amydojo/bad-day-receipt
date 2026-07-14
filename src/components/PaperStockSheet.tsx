import type { CSSProperties } from 'react'
import { themes, type ReceiptThemeId } from '../themes'

export function PaperStockSheet({
  selected,
  disabled,
  onSelect,
}: {
  selected: ReceiptThemeId
  disabled?: boolean
  onSelect: (id: ReceiptThemeId) => void
}) {
  return (
    <div className="sheet-option-list" role="list">
      {themes.map((theme, index) => {
        const active = selected === theme.id
        return (
          <button
            type="button"
            role="listitem"
            key={theme.id}
            className="sheet-paper-option"
            data-active={active}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onSelect(theme.id)}
            style={{
              '--card-paper': theme.palette.paper,
              '--card-ink': theme.palette.ink,
              '--card-accent': theme.palette.accent,
            } as CSSProperties}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <i aria-hidden="true">{theme.mark}</i>
            <strong>{theme.shortName}</strong>
            <small>{active ? 'LOADED' : 'LOAD PAPER'}</small>
          </button>
        )
      })}
    </div>
  )
}
