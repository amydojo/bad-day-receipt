import type { CatalogItem, ReceiptItem, ReceiptSummary } from './types'

export const catalog: CatalogItem[] = [
  { id: 'normal', label: 'Trying to act normal', amount: 14, kind: 'charge' },
  { id: 'worry', label: 'One unnecessary worry', amount: 8.75, kind: 'charge' },
  { id: 'phone', label: 'Unexpected phone call', amount: 12, kind: 'charge' },
  { id: 'decisions', label: 'Too many tiny decisions', amount: 9.25, kind: 'charge' },
  { id: 'public', label: 'Existing in public', amount: 11, kind: 'charge' },
  { id: 'hard-mode', label: 'Simple task on hard mode', amount: 7.5, kind: 'charge' },
  { id: 'email', label: 'Opening the email', amount: 5, kind: 'charge' },
  { id: 'perceived', label: 'Being perceived', amount: 13.5, kind: 'charge' },
  { id: 'battery', label: 'Social battery overdraft', amount: 18, kind: 'charge' },
  { id: 'sensory', label: 'Sensory nonsense surcharge', amount: 6.75, kind: 'charge' },
  { id: 'labor', label: 'Invisible emotional labor', amount: 16, kind: 'charge' },
  { id: 'dread', label: 'Hours lost to vague dread', amount: 21, kind: 'charge' },
  { id: 'food', label: 'Ate something', amount: -6, kind: 'credit' },
  { id: 'answered', label: 'Answered anyway', amount: -4, kind: 'credit' },
  { id: 'help', label: 'Asked for help', amount: -8, kind: 'credit' },
  { id: 'outside', label: 'Went outside', amount: -5, kind: 'credit' },
  { id: 'worse', label: "Didn't make it worse", amount: -7.25, kind: 'credit' },
  { id: 'beautiful', label: 'Tiny beautiful moment', amount: -12, kind: 'credit' },
  { id: 'rested', label: 'Rested without earning it', amount: -10, kind: 'credit' },
  { id: 'through', label: 'Made it through', amount: -15, kind: 'credit' },
]

export function summarizeReceipt(items: ReceiptItem[]): ReceiptSummary {
  const charges = items
    .filter((item) => item.amount > 0)
    .reduce((sum, item) => sum + item.amount * item.quantity, 0)
  const credits = Math.abs(
    items
      .filter((item) => item.amount < 0)
      .reduce((sum, item) => sum + item.amount * item.quantity, 0),
  )
  const emotionalTax = charges * 0.085
  const total = Math.max(0, charges + emotionalTax - credits)

  let status = 'weird little day'
  if (total >= 15) status = 'dented but operational'
  if (total >= 35) status = 'survivable'
  if (total >= 60) status = 'system under load'
  if (total >= 90) status = 'please be extremely gentle'

  return { charges, credits, emotionalTax, total, status }
}

export function currency(amount: number): string {
  const absolute = Math.abs(amount)
  return `${amount < 0 ? '-' : ''}$${absolute.toFixed(2)}`
}

export function makeReceiptNumber(): string {
  const date = new Date()
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `BD-${day}-${random}`
}
