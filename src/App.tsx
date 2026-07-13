import { useState, type CSSProperties, type FormEvent } from 'react'
import { ReceiptMachine } from './components/ReceiptMachine'
import { catalog, currency, makeReceiptNumber } from './receipt'
import { renderReceiptCanvas } from './receiptCanvas'
import {
  getTheme,
  themes,
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
          <Picker
            title="What charged you today?"
            number="01"
            items={charges}
            selected={items}
            onToggle={toggleItem}
          />
          <Picker
            title="What deserves store credit?"
            number="02"
            items={credits}
            selected={items}
            onToggle={toggleItem}
          />
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
                <select
                  value={customKind}
                  onChange={(event) => setCustomKind(event.target.value as LineItemKind)}
                >
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

        <aside className="receipt-stage">
          <ReceiptMachine
            items={items}
            receiptNumber={receiptNumber}
            theme={theme}
            onReceiptNumberChange={setReceiptNumber}
            onDownload={downloadReceipt}
            onClear={clearReceipt}
          />
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
              } as CSSProperties}
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

export default App
