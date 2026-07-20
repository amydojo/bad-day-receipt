import type { CSSProperties } from 'react'
import { fieldReleaseStamp } from '../field-access/fieldRelease'
import { getCurrentFieldAccess } from '../field-access/fieldAccessStorage'
import { currency, summarizeReceipt } from '../receipt'
import type { PrinterPhase } from '../printer/printerTypes'
import {
  getThemeItemLabel,
  getThemeStatus,
  type ReceiptTheme,
} from '../themes'
import type { ReceiptItem } from '../types'

export type ReceiptArtifactState =
  | 'printing'
  | 'settling'
  | 'documented'
  | 'end-choice'
  | 'keep-selected'
  | 'release-selected'
  | 'carry-selected'
  | 'recovery'

export interface ReceiptProps {
  items: ReceiptItem[]
  receiptNumber: string
  theme: ReceiptTheme
  phase: PrinterPhase
  visibleLineCount: number
  visibleTotalRows: number
  showVerdict: boolean
  couponProgress: number
  anomaly?: string | null
  printedAt?: string
  artifactState?: ReceiptArtifactState
}

export function Receipt({
  items,
  receiptNumber,
  theme,
  phase,
  visibleLineCount,
  visibleTotalRows,
  showVerdict,
  couponProgress,
  anomaly,
  printedAt,
  artifactState = 'printing',
}: ReceiptProps) {
  const summary = summarizeReceipt(items)
  const fieldAccess = typeof window !== 'undefined' && window.location.pathname.startsWith('/access/')
    ? getCurrentFieldAccess()
    : null
  const printedDate = printedAt && !Number.isNaN(Date.parse(printedAt))
    ? new Date(printedAt)
    : new Date()
  const date = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(printedDate)

  const totalRows: Array<[string, string, boolean]> = [
    ['DAMAGE SUBTOTAL', currency(summary.charges), false],
    [theme.taxLabel, currency(summary.emotionalTax), false],
    [theme.creditLabel, currency(-summary.credits), false],
    [theme.totalLabel, currency(summary.total), true],
  ]

  const coupons = theme.coupons ?? []
  const headerPrinted = phase !== 'arming'
  const bodyPrinted = ['scanning', 'calculating', 'feeding', 'stamping', 'falseComplete', 'printingCoupons', 'complete'].includes(phase)
  const couponTailMounted = ['printingCoupons', 'complete'].includes(phase)

  return (
    <article
      className="receipt"
      id="receipt"
      data-receipt-artifact
      data-receipt-number={receiptNumber}
      data-receipt-region="paper"
      data-receipt-ending-state={artifactState}
      data-theme={theme.id}
      data-phase={phase}
      data-blank-tip={phase === 'arming'}
    >
      <div className="receipt-paper-leader" aria-hidden="true" />
      <div className="receipt-registration" aria-hidden="true" data-printed={headerPrinted} />
      <div className="theme-mark" aria-hidden="true" data-printed={headerPrinted}>{theme.mark}</div>

      <div className="receipt-region receipt-region--header" data-receipt-region="header">
        <div className="receipt-header" data-printed={headerPrinted}>
          <p>{theme.eyebrow}</p>
          <h2>{theme.title}</h2>
          <p>{theme.department}</p>
        </div>

        <div className="receipt-meta" data-printed={headerPrinted}>
          <span>{date}</span>
          <span>{receiptNumber}</span>
          <span>{theme.servedBy}</span>
        </div>

        <div className="receipt-rule" data-printed={headerPrinted} />
      </div>

      <div
        className="receipt-lines"
        data-receipt-region="line-items"
        data-printed={bodyPrinted}
      >
        {items.length === 0 ? (
          <div className="empty-receipt">
            {theme.emptyState[0]}<br />{theme.emptyState[1]}
          </div>
        ) : items.map((item, index) => (
          <div
            className="receipt-line"
            data-printed={index < visibleLineCount}
            key={item.id}
          >
            <span>{getThemeItemLabel(item, theme).toUpperCase()}</span>
            <span>{currency(item.amount)}</span>
          </div>
        ))}
      </div>

      <div className="receipt-rule dashed" data-printed={visibleLineCount >= items.length && items.length > 0} />

      <div
        className="totals"
        data-receipt-region="total"
        data-printed={visibleTotalRows > 0}
      >
        {totalRows.map(([label, amount, isGrandTotal], index) => (
          <div
            className={isGrandTotal ? 'grand-total' : undefined}
            data-printed={index < visibleTotalRows}
            key={label}
          >
            <span>{label}</span>
            <span>{amount}</span>
          </div>
        ))}
      </div>

      <div className="status-stamp" data-visible={showVerdict}>
        {getThemeStatus(summary.status, theme)}
      </div>

      {anomaly && showVerdict && (
        <div className="receipt-anomaly">
          <span>REGISTER ADJUSTMENT</span>
          <strong>{anomaly}</strong>
        </div>
      )}

      <div className="receipt-note" data-printed={showVerdict}>
        {theme.notes.map((note) => <p key={note}>{note}</p>)}
      </div>

      <div
        className="receipt-acknowledgment"
        data-receipt-region="acknowledgment"
        data-printed={showVerdict}
      >
        <span>THIS DAY REQUIRED MORE</span>
        <span>THAN THE RECORD SHOWS.</span>
      </div>

      <p
        className="receipt-closing-mark"
        data-receipt-region="closing-mark"
        data-printed={showVerdict}
      >
        DAY DOCUMENTED
      </p>

      {fieldAccess && (
        <div
          className="receipt-field-provenance"
          data-printed={showVerdict}
          aria-label={`${fieldReleaseStamp(fieldAccess.edition)}, generated through LD–001`}
        >
          <span>GENERATED THROUGH LD–001</span>
          <span>{fieldReleaseStamp(fieldAccess.edition)}</span>
          <span>SOUTHERN CALIFORNIA FIELD RELEASE</span>
        </div>
      )}

      {couponTailMounted && coupons.length > 0 && (
        <div
          className="coupon-tail"
          aria-label="CVS catastrophe coupons"
          style={{ '--coupon-progress': couponProgress } as CSSProperties}
        >
          <p className="coupon-title">YOUR ABSURDLY LONG COUPONS</p>
          {coupons.map((coupon, index) => {
            const visible = couponProgress >= (index + 1) / coupons.length
            return (
              <div className="coupon" data-visible={visible} key={coupon.code}>
                <strong>{coupon.headline} — {coupon.detail}</strong>
                <small>VALID UNTIL YOUR NEXT MINOR INCONVENIENCE</small>
              </div>
            )
          })}
        </div>
      )}

      <div
        className="receipt-future-layer receipt-future-layer--perforation"
        data-receipt-region="perforation"
        aria-hidden="true"
      />
      <div
        className="receipt-future-layer receipt-future-layer--carry-stub"
        data-receipt-region="carry-stub"
        aria-hidden="true"
      />
      <div
        className="receipt-future-layer receipt-future-layer--transfer"
        data-receipt-region="transfer-layer"
        aria-hidden="true"
      />
      <div
        className="receipt-future-layer receipt-future-layer--archive-label"
        data-receipt-region="archive-label"
        aria-hidden="true"
      />

      <div className="barcode" aria-hidden="true" data-printed={showVerdict}>
        {Array.from({ length: 42 }, (_, index) => <i key={index} />)}
      </div>
      <div className="receipt-teeth bottom" aria-hidden="true" data-printed={showVerdict} />
    </article>
  )
}
