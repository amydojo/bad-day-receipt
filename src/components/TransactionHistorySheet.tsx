import type { ArtifactExport } from '../export/exportTypes'
import { currency } from '../receipt'
import type {
  ArchivedReceipt,
  CompletedReceiptSnapshot,
} from '../receipt-ending'
import { PrivateArchive } from '../receipt-ending/keep/PrivateArchive'
import type { ExportFormat, SavedTransaction } from '../v2'

export function TransactionHistorySheet({
  history,
  privateArchive,
  onCreateArchiveExport,
  onReprintArchived,
}: {
  history: SavedTransaction[]
  privateArchive: ArchivedReceipt[]
  onCreateArchiveExport: (
    receipt: CompletedReceiptSnapshot,
    format: ExportFormat,
  ) => Promise<ArtifactExport>
  onReprintArchived: (receipt: CompletedReceiptSnapshot) => void
}) {
  return (
    <div className="local-records-sheet">
      <PrivateArchive
        archive={privateArchive}
        onCreateExport={onCreateArchiveExport}
        onReprint={onReprintArchived}
      />

      <section className="transaction-history" aria-labelledby="transaction-history-heading">
        <div className="transaction-history__heading">
          <p>DOCUMENTED TRANSACTIONS</p>
          <h3 id="transaction-history-heading">RECENT RECEIPTS</h3>
        </div>
        {history.length === 0 ? (
          <p className="sheet-empty">NO PRIOR TRANSACTIONS ON THIS DEVICE</p>
        ) : (
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
        )}
      </section>
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
