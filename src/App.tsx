import { FormEvent, useMemo, useState } from 'react'
import { catalog, currency, makeReceiptNumber, summarizeReceipt } from './receipt'
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

  const summary = useMemo(() => summarizeReceipt(items), [items])
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
    const canvas = renderReceiptCanvas(items, receiptNumber)
    const link = document.createElement('a')
    link.download = `bad-day-receipt-${receiptNumber.toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand-lockup">
          <span className="brand-index">SOFT MACHINE 001</span>
          <h1>bad day<br />receipt</h1>
        </div>
        <p className="intro">
          An emotionally accurate receipt for days that cost too much.
          Add the damage. Credit the tiny wins. Keep the evidence.
        </p>
      </header>

      <section className="workspace" aria-label="Receipt builder">
        <div className="builder-panel">
          <Picker title="What charged you today?" items={charges} selected={items} onToggle={toggleItem} />
          <Picker title="What deserves store credit?" items={credits} selected={items} onToggle={toggleItem} />

          <form className="custom-form" onSubmit={addCustomItem}>
            <div className="section-heading">
              <span>03</span>
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
            <Receipt items={items} receiptNumber={receiptNumber} />
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
        <span>no refunds · no streaks · no account required</span>
      </footer>
    </main>
  )
}

function Picker({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string
  items: CatalogItem[]
  selected: ReceiptItem[]
  onToggle: (item: CatalogItem) => void
}) {
  const number = title.startsWith('What charged') ? '01' : '02'
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

function Receipt({ items, receiptNumber }: { items: ReceiptItem[]; receiptNumber: string }) {
  const summary = summarizeReceipt(items)
  const date = new Intl.DateTimeFormat('en-US', {
    month: '2-digit', day: '2-digit', year: '2-digit', hour: 'numeric', minute: '2-digit',
  }).format(new Date())

  return (
    <article className="receipt" id="receipt">
      <div className="receipt-teeth top" aria-hidden="true" />
      <div className="receipt-header">
        <p>THE HUMAN CONDITION</p>
        <h2>BAD DAY RECEIPT</h2>
        <p>RETURNS DEPARTMENT</p>
      </div>
      <div className="receipt-meta">
        <span>{date}</span>
        <span>{receiptNumber}</span>
        <span>SERVED BY: NERVOUS SYSTEM</span>
      </div>
      <div className="receipt-rule" />
      <div className="receipt-lines">
        {items.length === 0 ? (
          <div className="empty-receipt">NO DAMAGE RECORDED<br />SUSPICIOUS, BUT BEAUTIFUL</div>
        ) : items.map((item) => (
          <div className="receipt-line" key={item.id}>
            <span>{item.label.toUpperCase()}</span>
            <span>{currency(item.amount)}</span>
          </div>
        ))}
      </div>
      <div className="receipt-rule dashed" />
      <div className="totals">
        <div><span>DAMAGE SUBTOTAL</span><span>{currency(summary.charges)}</span></div>
        <div><span>EMOTIONAL TAX 8.5%</span><span>{currency(summary.emotionalTax)}</span></div>
        <div><span>CARE CREDITS</span><span>{currency(-summary.credits)}</span></div>
        <div className="grand-total"><span>TOTAL DAMAGE</span><span>{currency(summary.total)}</span></div>
      </div>
      <div className="status-stamp">{summary.status}</div>
      <div className="receipt-note">
        <p>RETURN POLICY: NONE.</p>
        <p>TOMORROW IS A FRESH TRANSACTION.</p>
        <p>THANK YOU FOR TRYING ANYWAY.</p>
      </div>
      <div className="barcode" aria-hidden="true">
        {Array.from({ length: 42 }, (_, index) => <i key={index} />)}
      </div>
      <div className="receipt-teeth bottom" aria-hidden="true" />
    </article>
  )
}

function renderReceiptCanvas(items: ReceiptItem[], receiptNumber: string): HTMLCanvasElement {
  const summary = summarizeReceipt(items)
  const width = 1000
  const lineHeight = 42
  const height = 720 + items.length * lineHeight
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.fillStyle = '#f4efd9'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#171713'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  ctx.font = '700 24px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText('THE HUMAN CONDITION', width / 2, 64)
  ctx.font = '900 54px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText('BAD DAY RECEIPT', width / 2, 104)
  ctx.font = '700 20px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText('RETURNS DEPARTMENT', width / 2, 174)

  ctx.textAlign = 'left'
  ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace'
  const date = new Intl.DateTimeFormat('en-US', {
    month: '2-digit', day: '2-digit', year: '2-digit', hour: 'numeric', minute: '2-digit',
  }).format(new Date())
  ctx.fillText(date.toUpperCase(), 70, 228)
  ctx.textAlign = 'right'
  ctx.fillText(receiptNumber, width - 70, 228)
  ctx.textAlign = 'left'
  ctx.fillText('SERVED BY: NERVOUS SYSTEM', 70, 260)

  ctx.strokeStyle = '#171713'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(70, 310)
  ctx.lineTo(width - 70, 310)
  ctx.stroke()

  let y = 346
  ctx.font = '19px ui-monospace, SFMono-Regular, Menlo, monospace'
  items.forEach((item) => {
    ctx.textAlign = 'left'
    ctx.fillText(item.label.toUpperCase().slice(0, 32), 70, y)
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
    ['EMOTIONAL TAX 8.5%', currency(summary.emotionalTax)],
    ['CARE CREDITS', currency(-summary.credits)],
  ]
  totalRows.forEach(([label, amount]) => {
    ctx.textAlign = 'left'
    ctx.fillText(label, 70, y)
    ctx.textAlign = 'right'
    ctx.fillText(amount, width - 70, y)
    y += 36
  })

  ctx.font = '900 28px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textAlign = 'left'
  ctx.fillText('TOTAL DAMAGE', 70, y + 12)
  ctx.textAlign = 'right'
  ctx.fillText(currency(summary.total), width - 70, y + 12)
  y += 78

  ctx.save()
  ctx.translate(width / 2, y + 22)
  ctx.rotate(-0.035)
  ctx.strokeStyle = '#d73b2f'
  ctx.lineWidth = 5
  ctx.strokeRect(-250, -28, 500, 58)
  ctx.fillStyle = '#d73b2f'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 25px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(summary.status.toUpperCase(), 0, 0)
  ctx.restore()
  y += 92

  ctx.fillStyle = '#171713'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText('RETURN POLICY: NONE.', width / 2, y)
  ctx.fillText('TOMORROW IS A FRESH TRANSACTION.', width / 2, y + 30)
  ctx.fillText('THANK YOU FOR TRYING ANYWAY.', width / 2, y + 60)

  const barcodeY = y + 118
  ctx.fillStyle = '#171713'
  for (let x = 170; x < width - 170; x += 13) {
    const barWidth = x % 4 === 0 ? 7 : 4
    const barHeight = x % 3 === 0 ? 66 : 54
    ctx.fillRect(x, barcodeY, barWidth, barHeight)
  }

  return canvas
}

export default App
