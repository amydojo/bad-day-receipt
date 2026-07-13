import { FormEvent, useState } from 'react'
import { catalog, currency, makeReceiptNumber, summarizeReceipt } from './receipt'
import {
  getTheme,
  getThemeItemLabel,
  getThemeStatus,
  themes,
  type ReceiptTheme,
  type ReceiptThemeId,
} from './themes'
import type { CatalogItem, LineItemKind, ReceiptItem } from './types'

const starterIds = ['normal', 'worry', 'decisions', 'food', 'through']

function App() {
  const [items, setItems] = useState<ReceiptItem[]>(
    catalog
      .filter((item) => starterIds.includes(item.id))
      .map((item) => ({ ...item, quantity: 1 })),
  )
  const [customLabel, setCustomLabel] = useState('')
  const [customKind, setCustomKind] = useState<LineItemKind>('charge')
  const [customAmount, setCustomAmount] = useState('7.00')
  const [receiptNumber, setReceiptNumber] = useState(makeReceiptNumber)
  const [isPrinting, setIsPrinting] = useState(false)
  const [themeId, setThemeId] = useState<ReceiptThemeId>('original')

  const theme = getTheme(themeId)
  const charges = catalog.filter((item) => item.kind === 'charge')
  const credits = catalog.filter((item) => item.kind === 'credit')

  const toggleItem = (catalogItem: CatalogItem) => {
    setItems((current) => {
      const exists = current.some((item) => item.id === catalogItem.id)
      if (exists) return current.filter((item) => item.id !== catalogItem.id)
      return [...current, { ...catalogItem, quantity: 1 }]
    })
  }

  const addCustomItem = (event: FormEvent) => {
    event.preventDefault()
    const parsedAmount = Number.parseFloat(customAmount)
    if (!customLabel.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) return

    const item: ReceiptItem = {
      id: `custom-${crypto.randomUUID()}`,
      label: customLabel.trim(),
      amount: customKind === 'credit' ? -parsedAmount : parsedAmount,
      kind: customKind,
      quantity: 1,
    }
    setItems((current) => [...current, item])
    setCustomLabel('')
  }

  const ringItUp = () => {
    setReceiptNumber(makeReceiptNumber())
    setIsPrinting(true)
    window.setTimeout(() => setIsPrinting(false), 850)
  }

  const clearReceipt = () => {
    setItems([])
    setReceiptNumber(makeReceiptNumber())
  }

  const downloadReceipt = () => {
    const canvas = renderReceiptCanvas(items, receiptNumber, theme)
    const link = document.createElement('a')
    link.download = `bad-day-receipt-${theme.id}-${receiptNumber.toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <main className="app-shell" data-active-theme={theme.id}>
      <header className="masthead">
        <div className="brand-lockup">
          <span className="brand-index">SOFT MACHINE 001 · THEME LAB</span>
          <h1>bad day<br />receipt</h1>
        </div>
        <p className="intro">
          An emotionally accurate receipt for days that cost too much.
          Pick the paperwork your nervous system deserves.
        </p>
      </header>

      <section className="workspace" aria-label="Receipt builder">
        <div className="builder-panel">
          <Picker title="What charged you today?" number="01" items={charges} selected={items} onToggle={toggleItem} />
          <Picker title="What deserves store credit?" number="02" items={credits} selected={items} onToggle={toggleItem} />
          <ThemePicker selected={themeId} onSelect={setThemeId} />

          <form className="custom-form" onSubmit={addCustomItem}>
            <div className="section-heading">
              <span>04</span>
              <h2>Add something suspiciously specific</h2>
            </div>
            <div className="custom-grid">
              <label className="field field-wide">
                <span>line item</span>
                <input
                  value={customLabel}
                  onChange={(event) => setCustomLabel(event.target.value)}
                  placeholder="Pretending the notification didn't scare me"
                  maxLength={42}
                />
              </label>
              <label className="field">
                <span>type</span>
                <select value={customKind} onChange={(event) => setCustomKind(event.target.value as LineItemKind)}>
                  <option value="charge">damage</option>
                  <option value="credit">tiny win</option>
                </select>
              </label>
              <label className="field">
                <span>amount</span>
                <input
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                  aria-label="Amount"
                />
              </label>
              <button className="add-button" type="submit">+ add line</button>
            </div>
          </form>
        </div>

        <aside className="receipt-stage" aria-live="polite">
          <div className={`receipt-wrap ${isPrinting ? 'printing' : ''}`}>
            <Receipt items={items} receiptNumber={receiptNumber} theme={theme} />
          </div>
          <div className="receipt-actions">
            <button className="primary-button" onClick={ringItUp} disabled={items.length === 0}>
              ring it up
            </button>
            <button className="secondary-button" onClick={downloadReceipt} disabled={items.length === 0}>
              save png
            </button>
            <button className="text-button" onClick={clearReceipt}>clear</button>
          </div>
          <p className="privacy-note">Nothing leaves your browser. Your bad day remains locally sourced.</p>
        </aside>
      </section>

      <footer>
        <span>made for tired little humans</span>
        <span>unofficial parody themes · no brands endorsed this emotional incident</span>
      </footer>
    </main>
  )
}

function Picker({
  title,
  number,
  items,
  selected,
  onToggle,
}: {
  title: string
  number: string
  items: CatalogItem[]
  selected: ReceiptItem[]
  onToggle: (item: CatalogItem) => void
}) {
  return (
    <section className="picker-section">
      <div className="section-heading">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      <div className="chip-grid">
        {items.map((item) => {
          const active = selected.some((selectedItem) => selectedItem.id === item.id)
          return (
            <button
              key={item.id}
              type="button"
              className={`choice-chip ${active ? 'active' : ''}`}
              aria-pressed={active}
              onClick={() => onToggle(item)}
            >
              <span>{item.label}</span>
              <strong>{currency(item.amount)}</strong>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ThemePicker({
  selected,
  onSelect,
}: {
  selected: ReceiptThemeId
  onSelect: (id: ReceiptThemeId) => void
}) {
  return (
    <section className="theme-section">
      <div className="section-heading">
        <span>03</span>
        <h2>Choose your emotional paperwork</h2>
      </div>
      <div className="theme-grid">
        {themes.map((theme) => {
          const active = selected === theme.id
          return (
            <button
              type="button"
              key={theme.id}
              className={`theme-card ${active ? 'active' : ''}`}
              aria-pressed={active}
              onClick={() => onSelect(theme.id)}
              style={{
                '--card-paper': theme.palette.paper,
                '--card-ink': theme.palette.ink,
                '--card-accent': theme.palette.accent,
              } as React.CSSProperties}
            >
              <span className="theme-ticket" aria-hidden="true">
                <i>{theme.mark}</i>
                <b>{theme.shortName}</b>
                <em />
              </span>
              <span className="theme-copy">
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
              </span>
              <span className="theme-check">{active ? 'selected' : 'choose'}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Receipt({
  items,
  receiptNumber,
  theme,
}: {
  items: ReceiptItem[]
  receiptNumber: string
  theme: ReceiptTheme
}) {
  const summary = summarizeReceipt(items)
  const date = new Intl.DateTimeFormat('en-US', {
    month: '2-digit', day: '2-digit', year: '2-digit', hour: 'numeric', minute: '2-digit',
  }).format(new Date())

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
          <div className="empty-receipt">{theme.emptyState[0]}<br />{theme.emptyState[1]}</div>
        ) : items.map((item) => (
          <div className="receipt-line" key={item.id}>
            <span>{getThemeItemLabel(item, theme).toUpperCase()}</span>
            <span>{currency(item.amount)}</span>
          </div>
        ))}
      </div>
      <div className="receipt-rule dashed" />
      <div className="totals">
        <div><span>DAMAGE SUBTOTAL</span><span>{currency(summary.charges)}</span></div>
        <div><span>{theme.taxLabel}</span><span>{currency(summary.emotionalTax)}</span></div>
        <div><span>{theme.creditLabel}</span><span>{currency(-summary.credits)}</span></div>
        <div className="grand-total"><span>{theme.totalLabel}</span><span>{currency(summary.total)}</span></div>
      </div>
      <div className="status-stamp">{getThemeStatus(summary.status, theme)}</div>
      <div className="receipt-note">
        {theme.notes.map((note) => <p key={note}>{note}</p>)}
      </div>
      {theme.couponLines && (
        <div className="coupon-tail" aria-label="CVS catastrophe coupons">
          <p className="coupon-title">YOUR ABSURDLY LONG COUPONS</p>
          {theme.couponLines.map((coupon) => (
            <div className="coupon" key={coupon}>
              <strong>{coupon}</strong>
              <small>VALID UNTIL YOUR NEXT MINOR INCONVENIENCE</small>
            </div>
          ))}
        </div>
      )}
      <div className="barcode" aria-hidden="true">
        {Array.from({ length: 42 }, (_, index) => <i key={index} />)}
      </div>
      <div className="receipt-teeth bottom" aria-hidden="true" />
    </article>
  )
}

function renderReceiptCanvas(
  items: ReceiptItem[],
  receiptNumber: string,
  theme: ReceiptTheme,
): HTMLCanvasElement {
  const summary = summarizeReceipt(items)
  const width = 1000
  const lineHeight = 42
  const couponHeight = theme.couponLines ? theme.couponLines.length * 138 + 120 : 0
  const height = 760 + items.length * lineHeight + couponHeight
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.fillStyle = theme.palette.paper
  ctx.fillRect(0, 0, width, height)
  drawThemeFrame(ctx, width, height, theme)

  ctx.fillStyle = theme.palette.ink
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  ctx.font = '700 22px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(theme.eyebrow, width / 2, 62)
  ctx.font = theme.titleFont
  ctx.fillText(theme.title, width / 2, 104)
  ctx.font = '700 19px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(theme.department, width / 2, 180)

  ctx.textAlign = 'left'
  ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace'
  const date = new Intl.DateTimeFormat('en-US', {
    month: '2-digit', day: '2-digit', year: '2-digit', hour: 'numeric', minute: '2-digit',
  }).format(new Date())
  ctx.fillText(date.toUpperCase(), 70, 232)
  ctx.textAlign = 'right'
  ctx.fillText(receiptNumber, width - 70, 232)
  ctx.textAlign = 'left'
  ctx.fillText(theme.servedBy, 70, 266)

  ctx.strokeStyle = theme.palette.ink
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(70, 316)
  ctx.lineTo(width - 70, 316)
  ctx.stroke()

  let y = 352
  ctx.font = theme.bodyFont
  items.forEach((item) => {
    ctx.textAlign = 'left'
    ctx.fillText(getThemeItemLabel(item, theme).toUpperCase().slice(0, 34), 70, y)
    ctx.textAlign = 'right'
    ctx.fillText(currency(item.amount), width - 70, y)
    y += lineHeight
  })

  y += 8
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.moveTo(70, y)
  ctx.lineTo(width - 70, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 34

  const totalRows: Array<[string, string]> = [
    ['DAMAGE SUBTOTAL', currency(summary.charges)],
    [theme.taxLabel, currency(summary.emotionalTax)],
    [theme.creditLabel, currency(-summary.credits)],
  ]
  ctx.font = theme.bodyFont
  totalRows.forEach(([label, amount]) => {
    ctx.textAlign = 'left'
    ctx.fillText(label, 70, y)
    ctx.textAlign = 'right'
    ctx.fillText(amount, width - 70, y)
    y += 36
  })

  ctx.font = theme.id === 'luxury'
    ? '700 30px Georgia, Times New Roman, serif'
    : '900 28px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textAlign = 'left'
  ctx.fillText(theme.totalLabel, 70, y + 12)
  ctx.textAlign = 'right'
  ctx.fillText(currency(summary.total), width - 70, y + 12)
  y += 82

  ctx.save()
  ctx.translate(width / 2, y + 22)
  ctx.rotate(theme.id === 'government' ? -0.018 : -0.035)
  ctx.strokeStyle = theme.palette.accent
  ctx.lineWidth = 5
  ctx.strokeRect(-290, -30, 580, 62)
  ctx.fillStyle = theme.palette.accent
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 24px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(getThemeStatus(summary.status, theme).toUpperCase(), 0, 0)
  ctx.restore()
  y += 96

  ctx.fillStyle = theme.palette.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace'
  theme.notes.forEach((note, index) => ctx.fillText(note, width / 2, y + index * 30))
  y += 112

  if (theme.couponLines) {
    ctx.fillStyle = theme.palette.accent
    ctx.fillRect(70, y, width - 140, 50)
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 22px Arial, Helvetica, sans-serif'
    ctx.fillText('YOUR ABSURDLY LONG COUPONS', width / 2, y + 13)
    y += 76

    theme.couponLines.forEach((coupon) => {
      ctx.strokeStyle = theme.palette.accent
      ctx.lineWidth = 3
      ctx.setLineDash([8, 7])
      ctx.strokeRect(70, y, width - 140, 108)
      ctx.setLineDash([])
      ctx.fillStyle = theme.palette.ink
      ctx.font = '900 24px Arial, Helvetica, sans-serif'
      ctx.fillText(coupon, width / 2, y + 22)
      ctx.font = '15px Arial, Helvetica, sans-serif'
      ctx.fillText('VALID UNTIL YOUR NEXT MINOR INCONVENIENCE', width / 2, y + 68)
      y += 138
    })
  }

  const barcodeY = y + 12
  ctx.fillStyle = theme.palette.ink
  for (let x = 170; x < width - 170; x += 13) {
    const barWidth = x % 4 === 0 ? 7 : 4
    const barHeight = x % 3 === 0 ? 66 : 54
    ctx.fillRect(x, barcodeY, barWidth, barHeight)
  }

  return canvas
}

function drawThemeFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ReceiptTheme,
) {
  if (theme.id === 'cvs') {
    ctx.fillStyle = theme.palette.accent
    ctx.fillRect(0, 0, width, 22)
    ctx.fillRect(0, height - 22, width, 22)
  }

  if (theme.id === 'government') {
    ctx.strokeStyle = theme.palette.ink
    ctx.lineWidth = 4
    ctx.strokeRect(32, 32, width - 64, height - 64)
    ctx.font = '900 34px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillStyle = theme.palette.accent
    ctx.textAlign = 'right'
    ctx.fillText('BD-17', width - 58, 48)
  }

  if (theme.id === 'luxury') {
    ctx.strokeStyle = theme.palette.accent
    ctx.lineWidth = 2
    ctx.strokeRect(38, 38, width - 76, height - 76)
    ctx.strokeRect(48, 48, width - 96, height - 96)
  }

  if (theme.id === 'victorian') {
    ctx.strokeStyle = theme.palette.ink
    ctx.lineWidth = 3
    ctx.strokeRect(28, 28, width - 56, height - 56)
    ctx.lineWidth = 1
    ctx.strokeRect(40, 40, width - 80, height - 80)
    ctx.textAlign = 'center'
    ctx.fillStyle = theme.palette.accent
    ctx.font = '700 42px Georgia, Times New Roman, serif'
    ctx.fillText('✦', width / 2, 34)
  }
}

export default App
