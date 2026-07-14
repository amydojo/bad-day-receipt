import { useState, type FormEvent } from 'react'
import { currency } from '../receipt'
import type { CatalogItem, LineItemKind, ReceiptItem } from '../types'

interface ChargeBuilderProps {
  charges: CatalogItem[]
  credits: CatalogItem[]
  selected: ReceiptItem[]
  dailyId?: string
  disabled?: boolean
  onToggle: (item: CatalogItem) => void
  onQuantityChange: (itemId: string, quantity: number) => void
  onAddCustom: (item: ReceiptItem) => void
}

export function ChargeBuilder({
  charges,
  credits,
  selected,
  dailyId,
  disabled = false,
  onToggle,
  onQuantityChange,
  onAddCustom,
}: ChargeBuilderProps) {
  const [customLabel, setCustomLabel] = useState('')
  const [customKind, setCustomKind] = useState<LineItemKind>('charge')
  const [customAmount, setCustomAmount] = useState('7.00')

  const addCustomItem = (event: FormEvent) => {
    event.preventDefault()
    if (disabled) return
    const parsedAmount = Number.parseFloat(customAmount)
    if (!customLabel.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) return

    onAddCustom({
      id: `custom-${crypto.randomUUID()}`,
      label: customLabel.trim(),
      amount: customKind === 'credit' ? -parsedAmount : parsedAmount,
      kind: customKind,
      quantity: 1,
    })
    setCustomLabel('')
  }

  return (
    <div className="builder-panel" data-locked={disabled}>
      <Picker
        title="What charged you today?"
        number="02"
        items={charges}
        selected={selected}
        onToggle={onToggle}
        onQuantityChange={onQuantityChange}
        dailyId={dailyId}
        disabled={disabled}
      />
      <Picker
        title="What deserves store credit?"
        number="03"
        items={credits}
        selected={selected}
        onToggle={onToggle}
        onQuantityChange={onQuantityChange}
        disabled={disabled}
      />

      <form className="custom-form" onSubmit={addCustomItem} aria-disabled={disabled}>
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
              disabled={disabled}
            />
          </label>
          <label className="field">
            <span>type</span>
            <select
              value={customKind}
              onChange={(event) => setCustomKind(event.target.value as LineItemKind)}
              disabled={disabled}
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
              disabled={disabled}
            />
          </label>
          <button className="add-button" type="submit" disabled={disabled}>+ scan line</button>
        </div>
      </form>
    </div>
  )
}

function Picker({
  title,
  number,
  items,
  selected,
  onToggle,
  onQuantityChange,
  dailyId,
  disabled,
}: {
  title: string
  number: string
  items: CatalogItem[]
  selected: ReceiptItem[]
  onToggle: (item: CatalogItem) => void
  onQuantityChange: (itemId: string, quantity: number) => void
  dailyId?: string
  disabled: boolean
}) {
  return (
    <section className="picker-section">
      <div className="section-heading">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      <div className="chip-grid">
        {items.map((item) => {
          const selectedItem = selected.find((candidate) => candidate.id === item.id)
          const active = Boolean(selectedItem)
          const quantity = selectedItem?.quantity ?? 0
          const isDaily = item.id === dailyId

          return (
            <div className="choice-row" data-active={active} key={item.id}>
              <button
                type="button"
                className={`choice-chip ${active ? 'active' : ''}`}
                aria-pressed={active}
                onClick={() => onToggle(item)}
                disabled={disabled}
              >
                <span>
                  {isDaily && <small>DAILY REGISTER SPECIAL</small>}
                  {item.label}
                  {active && <em>SCANNED</em>}
                </span>
                <strong>{currency(item.amount)}</strong>
              </button>

              {active && (
                <div className="quantity-stepper" aria-label={`${item.label} quantity`}>
                  <button
                    type="button"
                    aria-label={`Decrease ${item.label}`}
                    onClick={() => onQuantityChange(item.id, quantity - 1)}
                    disabled={disabled}
                  >
                    −
                  </button>
                  <output aria-live="polite">QTY {quantity}</output>
                  <button
                    type="button"
                    aria-label={`Increase ${item.label}`}
                    onClick={() => onQuantityChange(item.id, quantity + 1)}
                    disabled={disabled || quantity >= 9}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
