import { useMemo, useState, type FormEvent } from 'react'
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
  const knownIds = useMemo(
    () => new Set([...charges, ...credits].map((item) => item.id)),
    [charges, credits],
  )
  const customItems = selected.filter((item) => !knownIds.has(item.id))

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

      {customItems.length > 0 && (
        <section className="picker-section" aria-labelledby="specific-lines-heading">
          <div className="section-heading">
            <span>04</span>
            <h2 id="specific-lines-heading">Your suspiciously specific lines</h2>
          </div>
          <div className="chip-grid">
            {customItems.map((item) => (
              <ChoiceRow
                key={item.id}
                item={item}
                selectedItem={item}
                disabled={disabled}
                onToggle={onToggle}
                onQuantityChange={onQuantityChange}
              />
            ))}
          </div>
        </section>
      )}

      <form className="custom-form" onSubmit={addCustomItem} aria-disabled={disabled}>
        <div className="section-heading">
          <span>{customItems.length > 0 ? '05' : '04'}</span>
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
        {items.map((item) => (
          <ChoiceRow
            key={item.id}
            item={item}
            selectedItem={selected.find((candidate) => candidate.id === item.id)}
            isDaily={item.id === dailyId}
            disabled={disabled}
            onToggle={onToggle}
            onQuantityChange={onQuantityChange}
          />
        ))}
      </div>
    </section>
  )
}

function ChoiceRow({
  item,
  selectedItem,
  isDaily = false,
  disabled,
  onToggle,
  onQuantityChange,
}: {
  item: CatalogItem
  selectedItem?: ReceiptItem
  isDaily?: boolean
  disabled: boolean
  onToggle: (item: CatalogItem) => void
  onQuantityChange: (itemId: string, quantity: number) => void
}) {
  const active = Boolean(selectedItem)
  const quantity = selectedItem?.quantity ?? 0

  return (
    <div className="choice-row" data-active={active}>
      <button
        type="button"
        className={`choice-chip ${active ? 'active' : ''}`}
        data-item-id={item.id}
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
}
