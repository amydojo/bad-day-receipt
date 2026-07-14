import { currency } from '../receipt'
import type { SavedTransaction } from '../v2'

export function TransactionHistorySheet({ history }: { history: SavedTransaction[] }) {
  if (history.length === 0) {
    return <p className="sheet-empty">NO PRIOR EVIDENCE ON THIS DEVICE</p>
  }

  return (
    <div className="sheet-history-list">
      {history.map((entry) => (
        <article key={entry.id}>
          <time dateTime={entry.createdAt}>
            {formatDate(entry.createdAt)}
          </time>
          <span>{entry.themeName}</span>
          <strong>{currency(entry.total)}</strong>
          <small>{entry.itemCount} ITEMS · {entry.receiptNumber}</small>
        </article>
      ))}
      <p>LAST FIVE · STORED ONLY IN THIS BROWSER</p>
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'UNKNOWN DATE'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' })
    .format(date)
    .toUpperCase()
}
