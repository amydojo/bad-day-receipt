import { useMemo, useState } from 'react'
import { createDojoArchiveHandoffUrl } from '../../dojoLab'
import type { ArtifactExport } from '../../export/exportTypes'
import { currency } from '../../receipt'
import {
  copyArtifactText,
  createBrowserArtifactPlatform,
  saveArtifact,
} from '../../soft-machine/artifactActions'
import { getTheme } from '../../themes'
import type { ExportFormat } from '../../v2'
import { ReceiptArtifact } from '../ReceiptArtifact'
import type {
  ArchivedReceipt,
  ReceiptEndingState,
} from '../receiptEndingTypes'
import { THREE_ENDINGS_ENABLED } from '../threeEndingsFeature'

export function PrivateArchive({
  archive,
  onCreateExport,
  onReprint,
  onRelease,
}: {
  archive: ArchivedReceipt[]
  onCreateExport: (
    receipt: ArchivedReceipt['receipt'],
    format: ExportFormat,
  ) => Promise<ArtifactExport>
  onReprint: (receipt: ArchivedReceipt['receipt']) => void
  onRelease?: (entry: ArchivedReceipt) => void
}) {
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState<string | null>(null)
  const selected = archive.find((entry) => (
    entry.receipt.receiptNumber === selectedReceiptNumber
  )) ?? null

  if (selected) {
    return (
      <ArchivedReceiptDetail
        entry={selected}
        onBack={() => setSelectedReceiptNumber(null)}
        onCreateExport={onCreateExport}
        onReprint={onReprint}
        onRelease={THREE_ENDINGS_ENABLED ? onRelease : undefined}
      />
    )
  }

  return (
    <section className="private-archive" aria-labelledby="private-archive-heading">
      <div className="private-archive__heading">
        <div>
          <p>LOCAL ONLY</p>
          <h3 id="private-archive-heading">PRIVATE ARCHIVE</h3>
        </div>
        <strong aria-label={`${archive.length} archived receipts`}>{archive.length}/5</strong>
      </div>
      <p className="private-archive__description">Stored only on this device.</p>

      {archive.length === 0 ? (
        <p className="private-archive__empty">NO RECEIPTS PRESERVED YET</p>
      ) : (
        <div className="private-archive__list">
          {archive.map((entry) => (
            <button
              type="button"
              className="private-archive__entry"
              key={entry.receipt.receiptNumber}
              onClick={() => setSelectedReceiptNumber(entry.receipt.receiptNumber)}
              aria-label={`Open archived receipt ${entry.receipt.receiptNumber}`}
            >
              <span>
                <time dateTime={entry.receipt.completedAt}>{formatShortDate(entry.receipt.completedAt)}</time>
                <small>{entry.receipt.themeName}</small>
              </span>
              <span>
                <strong>{currency(entry.receipt.total)}</strong>
                <small>{entry.receipt.receiptNumber}</small>
              </span>
              <em>ARCHIVED {formatShortDate(entry.archivedAt)}</em>
            </button>
          ))}
        </div>
      )}

      <p className="private-archive__policy">NEWEST FIVE · LOCAL BROWSER STORAGE</p>
    </section>
  )
}

function ArchivedReceiptDetail({
  entry,
  onBack,
  onCreateExport,
  onReprint,
  onRelease,
}: {
  entry: ArchivedReceipt
  onBack: () => void
  onCreateExport: (
    receipt: ArchivedReceipt['receipt'],
    format: ExportFormat,
  ) => Promise<ArtifactExport>
  onReprint: (receipt: ArchivedReceipt['receipt']) => void
  onRelease?: (entry: ArchivedReceipt) => void
}) {
  const platform = useMemo(createBrowserArtifactPlatform, [])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const receipt = entry.receipt
  const theme = getTheme(receipt.themeId)
  const endingState: ReceiptEndingState['kind'] = 'documented'

  const copyText = async () => {
    if (busy) return
    setBusy(true)
    const result = await copyArtifactText(receipt.shareCopy, platform)
    setMessage(result.status === 'copied'
      ? 'COPIED TO CLIPBOARD'
      : 'COPY FAILED · SELECT THE RECEIPT TEXT MANUALLY')
    setBusy(false)
  }

  const exportReceipt = async () => {
    if (busy) return
    setBusy(true)
    setMessage('PREPARING LOCAL COPY…')
    try {
      const artifact = await onCreateExport(receipt, 'full')
      const result = saveArtifact(artifact, platform)
      setMessage(result.status === 'saved'
        ? 'LOCAL COPY SAVED'
        : 'EXPORT JAMMED · THE ARCHIVED RECEIPT IS SAFE')
    } catch {
      setMessage('EXPORT JAMMED · THE ARCHIVED RECEIPT IS SAFE')
    } finally {
      setBusy(false)
    }
  }

  const dojoHref = createDojoArchiveHandoffUrl({
    receiptNumber: receipt.receiptNumber,
    paperName: receipt.themeName,
    shareText: receipt.shareCopy,
  })

  return (
    <section className="archived-receipt-detail" aria-labelledby="archived-receipt-heading">
      <div className="archived-receipt-detail__header">
        <button type="button" onClick={onBack}>BACK TO PRIVATE ARCHIVE</button>
        <div>
          <p>STORED ONLY ON THIS DEVICE</p>
          <h3 id="archived-receipt-heading">Receipt {receipt.receiptNumber}</h3>
          <small>
            DOCUMENTED {formatLongDate(receipt.completedAt)} · ARCHIVED {formatLongDate(entry.archivedAt)}
          </small>
        </div>
      </div>

      <div
        className="archived-receipt-detail__viewport"
        role="region"
        aria-label={`Archived receipt ${receipt.receiptNumber}`}
        tabIndex={0}
      >
        <ReceiptArtifact
          artifactId={`archived-receipt-${receipt.receiptNumber}`}
          items={receipt.items}
          receiptNumber={receipt.receiptNumber}
          theme={theme}
          phase="complete"
          visibleLineCount={receipt.items.length}
          visibleTotalRows={4}
          showVerdict
          couponProgress={1}
          anomaly={receipt.anomaly}
          printedAt={receipt.completedAt}
          endingState={endingState}
        />
      </div>

      <div className="archived-receipt-detail__actions" aria-label="Archived receipt actions">
        <button type="button" disabled={busy} onClick={() => { void copyText() }}>COPY TEXT</button>
        <button type="button" disabled={busy} onClick={() => { void exportReceipt() }}>EXPORT</button>
        <button type="button" disabled={busy} onClick={() => window.location.assign(dojoHref)}>SEND TO DOJO ARCHIVE</button>
        <button type="button" disabled={busy} onClick={() => onReprint(receipt)}>REPRINT</button>
        {onRelease && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRelease(entry)}
            aria-describedby="archived-release-description"
          >
            LET IT GO
          </button>
        )}
      </div>
      {onRelease && (
        <p id="archived-release-description" className="archived-receipt-detail__release-note">
          Release this local archived copy with an eight-second Undo window.
        </p>
      )}
      <p className="archived-receipt-detail__status" aria-live="polite">{message}</p>
    </section>
  )
}

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'UNKNOWN DATE'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' })
    .format(date)
    .toUpperCase()
}

function formatLongDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'UNKNOWN DATE'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date).toUpperCase()
}
