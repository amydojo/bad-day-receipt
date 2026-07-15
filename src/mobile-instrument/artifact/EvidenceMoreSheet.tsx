import type { ExportFormat } from '../../v2'
import { ExportFormatSheet } from '../../components/ExportFormatSheet'

export function EvidenceMoreSheet({
  receiptNumber,
  paperName,
  busy,
  onSave,
  onCopy,
  onReprint,
}: {
  receiptNumber: string
  paperName: string
  busy: boolean
  onSave: (format: ExportFormat) => void
  onCopy: () => void
  onReprint: () => void
}) {
  return (
    <div className="evidence-more-sheet">
      <dl className="evidence-details">
        <div><dt>RECEIPT</dt><dd>{receiptNumber}</dd></div>
        <div><dt>PAPER</dt><dd>{paperName}</dd></div>
        <div><dt>STATUS</dt><dd>RECORDED LOCALLY</dd></div>
      </dl>

      <div className="evidence-more-actions">
        <button type="button" disabled={busy} onClick={onCopy}>
          <strong>COPY TEXT</strong>
          <small>Copy a plain-language evidence summary</small>
        </button>
        <button type="button" disabled={busy} onClick={onReprint}>
          <strong>REPRINT</strong>
          <small>Run this transaction through the machine again</small>
        </button>
      </div>

      <div className="evidence-more-formats">
        <span>ALTERNATE EVIDENCE FORMATS</span>
        <ExportFormatSheet busy={busy} onSave={onSave} />
      </div>
    </div>
  )
}
