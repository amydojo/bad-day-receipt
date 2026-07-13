import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { ReceiptMachine } from './components/ReceiptMachine'
import { catalog, currency, makeReceiptNumber } from './receipt'
import { downloadExport } from './socialExports'
import {
  getTheme,
  themes,
  type ReceiptThemeId,
} from './themes'
import type { CatalogItem, LineItemKind, ReceiptItem } from './types'
import {
  createSavedTransaction,
  createShareCopy,
  getDailyItem,
  getLiveSummary,
  getRareAnomaly,
  getStickyBarState,
  readHistory,
  writeHistory,
  type ExportFormat,
  type SavedTransaction,
} from './v2'

const starterIds = ['normal', 'worry', 'decisions', 'food', 'through']

function App() {
  const dailyItem = useMemo(() => getDailyItem(), [])
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
  const [history, setHistory] = useState<SavedTransaction[]>(() => readHistory())
  const [printerVisible, setPrinterVisible] = useState(false)
  const printerRef = useRef<HTMLElement | null>(null)

  const theme = getTheme(themeId)
  const charges = useMemo(
    () => [dailyItem, ...catalog.filter((item) => item.kind === 'charge')],
    [dailyItem],
  )
  const credits = catalog.filter((item) => item.kind === 'credit')
  const live = getLiveSummary(items)
  const sticky = getStickyBarState(items, printerVisible)
  const anomaly = getRareAnomaly(receiptNumber)
  const shareCopy = createShareCopy(items, live.total, theme.name)

  useEffect(() => {
    const node = printerRef.current
    if (!node || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      ([entry]) => setPrinterVisible(entry.isIntersecting),
      { threshold: 0.16 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

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

  const makeAnother = () => {
    setReceiptNumber(makeReceiptNumber())
    setItems(
      catalog
        .filter((item) => starterIds.includes(item.id))
        .map((item) => ({ ...item, quantity: 1 })),
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToPrinter = () => {
    printerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const recordTransaction = () => {
    const transaction = createSavedTransaction({
      receiptNumber,
      themeId: theme.id,
      themeName: theme.name,
      total: live.total,
      itemCount: live.itemCount,
      status: live.status,
      shareCopy,
    })
    setHistory(writeHistory(transaction))
  }

  const exportReceipt = (format: ExportFormat) => {
    downloadExport(items, receiptNumber, theme, format)
  }

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareCopy)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = shareCopy
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }
  }

  return (
    <main className="app-shell v2-shell" data-active-theme={theme.id}>
      <header className="masthead v2-masthead">
        <div className="system-row" aria-label="System status">
          <span>SOFT MACHINE 001 · EMOTIONAL POS</span>
          <span><i aria-hidden="true" /> READY · LOCAL ONLY</span>
        </div>
        <div className="brand-lockup">
          <h1>bad day<br />receipt</h1>
        </div>
        <div className="hero-copy">
          <p className="intro">Turn today’s invisible costs into official documentation.</p>
          <p>NO ACCOUNT · NO DIAGNOSIS · JUST RECEIPTS</p>
        </div>
        <div className="hero-transaction" aria-live="polite">
          <span>CURRENT TRANSACTION</span>
          <strong>{live.itemCount} ITEMS · {currency(live.total)}</strong>
        </div>
      </header>

      <section className="theme-section theme-section-first" aria-labelledby="paperwork-heading">
        <div className="section-heading">
          <span>01</span>
          <h2 id="paperwork-heading">Choose your paperwork</h2>
        </div>
        <ThemePicker selected={themeId} onSelect={setThemeId} />
      </section>

      <section className="workspace" aria-label="Emotional point of sale">
        <div className="builder-panel">
          <Picker
            title="What charged you today?"
            number="02"
            items={charges}
            selected={items}
            onToggle={toggleItem}
            dailyId={dailyItem.id}
          />
          <Picker
            title="What deserves store credit?"
            number="03"
            items={credits}
            selected={items}
            onToggle={toggleItem}
          />

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
              <button className="add-button" type="submit">+ scan line</button>
            </div>
          </form>
        </div>

        <aside className="receipt-stage" ref={printerRef}>
          <ReceiptMachine
            items={items}
            receiptNumber={receiptNumber}
            theme={theme}
            anomaly={anomaly}
            shareCopy={shareCopy}
            onReceiptNumberChange={setReceiptNumber}
            onExport={exportReceipt}
            onCopyShare={copyShareText}
            onTransactionComplete={recordTransaction}
            onMakeAnother={makeAnother}
            onClear={clearReceipt}
          />
        </aside>
      </section>

      <TransactionDrawer history={history} />

      <footer>
        <span>made for tired little humans</span>
        <span>all transactions remain locally sourced</span>
      </footer>

      <button
        type="button"
        className="sticky-transaction"
        data-visible={sticky.shouldStick}
        onClick={scrollToPrinter}
        aria-label={`View printer. ${live.itemCount} items totaling ${currency(live.total)}`}
      >
        <span><b>{live.itemCount}</b> ITEMS</span>
        <strong>{currency(live.total)}</strong>
        <span>{sticky.actionLabel} ↑</span>
      </button>
    </main>
  )
}

function Picker({
  title,
  number,
  items,
  selected,
  onToggle,
  dailyId,
}: {
  title: string
  number: string
  items: CatalogItem[]
  selected: ReceiptItem[]
  onToggle: (item: CatalogItem) => void
  dailyId?: string
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
          const isDaily = item.id === dailyId
          return (
            <button
              key={item.id}
              type="button"
              className={`choice-chip ${active ? 'active' : ''}`}
              aria-pressed={active}
              onClick={() => onToggle(item)}
            >
              <span>
                {isDaily && <small>DAILY REGISTER SPECIAL</small>}
                {item.label}
                {active && <em>SCANNED</em>}
              </span>
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
    <div className="theme-strip" role="list">
      {themes.map((theme, index) => {
        const active = selected === theme.id
        return (
          <button
            type="button"
            key={theme.id}
            className={`theme-tab ${active ? 'active' : ''}`}
            aria-pressed={active}
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
            <small>{active ? 'LOADED' : 'PAPER STOCK'}</small>
          </button>
        )
      })}
    </div>
  )
}

function TransactionDrawer({ history }: { history: SavedTransaction[] }) {
  return (
    <section className="transaction-drawer" aria-labelledby="drawer-heading">
      <div className="section-heading">
        <span>05</span>
        <h2 id="drawer-heading">Local transaction drawer</h2>
      </div>
      {history.length === 0 ? (
        <p className="drawer-empty">NO PRIOR EVIDENCE ON THIS DEVICE</p>
      ) : (
        <div className="drawer-list">
          {history.map((transaction) => (
            <article key={transaction.id}>
              <time dateTime={transaction.createdAt}>
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(transaction.createdAt)).toUpperCase()}
              </time>
              <span>{transaction.themeName}</span>
              <strong>{currency(transaction.total)}</strong>
              <small>{transaction.itemCount} ITEMS · {transaction.receiptNumber}</small>
            </article>
          ))}
        </div>
      )}
      <p className="drawer-note">LAST FIVE · STORED ONLY IN THIS BROWSER</p>
    </section>
  )
}

export default App
