import type { CSSProperties } from 'react'
import { currency, summarizeReceipt } from '../receipt'
import {
  getThemeItemLabel,
  getThemeStatus,
  type ReceiptTheme,
} from '../themes'
import type { ReceiptItem } from '../types'

interface ReceiptProps {
  items: ReceiptItem[]
  receiptNumber: string
  theme: ReceiptTheme
  visibleLineCount: number
  visibleTotalRows: number
  showVerdict: boolean
  couponProgress: number
}

export function Receipt({
  items,
  receiptNumber,
  theme,
  visibleLineCount,
  visibleTotalRows,
  showVerdict,
  couponProgress,
}: ReceiptProps) {
  const summary = summarizeReceipt(items)
  const date = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())

  const totalRows: Array<[string, string, boolean]> = [
    ['DAMAGE SUBTOTAL', currency(summary.charges), false],
    [theme.taxLabel, currency(summary.emotionalTax), false],
    [theme.creditLabel, currency(-summary.credits), false],
    [theme.totalLabel, currency(summary.total), true],
  ]

  const coupons = theme.coupons ?? []

  return (
    <article className="receipt" id="receipt" data-theme={theme.id}>
      <div className="receipt-teeth top" aria-hidden="true" />
      <div className="theme-mark" aria-hidden="true">{theme.mark}</div>

      <div className="receipt-header">
        <p>{theme.eyebrow}</p>
        <h2>{theme.title}</h2>
        <p>{theme.department}</p>
      </div>

      <div className="receipt-meta">
        <span>{date}</span>
        <span>{receiptNumber}</span>
        <span>{theme.servedBy}</span>
      </div>

      <div className="receipt-rule" />

      <div className="receipt-lines">
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

      <div className="receipt-rule dashed" />

      <div className="totals">
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

      <div className="receipt-note" data-printed={showVerdict}>
        {theme.notes.map((note) => <p key={note}>{note}</p>)}
      </div>

      {coupons.length > 0 && (
        <div
          className="coupon-tail"
          aria-label="CVS catastrophe coupons"
          style={{ '--coupon-progress': couponProgress } as CSSProperties}
        >
          <p className="coupon-title">YOUR ABSURDLY LONG COUPONS</p>
          {coupons.map((coupon, index) => {
            const visible = couponProgress >= (index + 1) / coupons.length

            return (
              <div
                className="coupon"
                data-visible={visible}
                key={coupon.code}
              >
                <strong>{coupon.headline} — {coupon.detail}</strong>
                <small>VALID UNTIL YOUR NEXT MINOR INCONVENIENCE</small>
              </div>
            )
          })}
        </div>
      )}

      <div className="barcode" aria-hidden="true">
        {Array.from({ length: 42 }, (_, index) => <i key={index} />)}
      </div>
      <div className="receipt-teeth bottom" aria-hidden="true" />
    </article>
  )
}
