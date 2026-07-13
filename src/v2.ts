import { summarizeReceipt } from './receipt'
import type { ReceiptThemeId } from './themes'
import type { CatalogItem, ReceiptItem } from './types'

export const HISTORY_KEY = 'bad-day-receipt-history-v2'
export const MAX_HISTORY = 5

export type ExportFormat = 'full' | 'share' | 'story'

export interface SavedTransaction {
  id: string
  receiptNumber: string
  createdAt: string
  themeId: ReceiptThemeId
  themeName: string
  total: number
  itemCount: number
  status: string
  shareCopy: string
}

const dailyItems: CatalogItem[] = [
  { id: 'daily-embarrassment', label: 'Remembered something embarrassing from 2018', amount: 6.66, kind: 'charge' },
  { id: 'daily-fridge', label: 'Opened the fridge without a plan', amount: 3.25, kind: 'charge' },
  { id: 'daily-can-we-talk', label: 'Received “can we talk?”', amount: 17.5, kind: 'charge' },
  { id: 'daily-room-personality', label: 'Adjusted personality for the room', amount: 11.75, kind: 'charge' },
  { id: 'daily-loading', label: 'Waited for the brain to finish loading', amount: 8.25, kind: 'charge' },
  { id: 'daily-tab', label: 'Kept one emotionally dangerous tab open', amount: 5.5, kind: 'charge' },
  { id: 'daily-reply', label: 'Drafted the reply in the nervous system', amount: 9.75, kind: 'charge' },
]

export const anomalies = [
  'MANAGER DISCOUNT: DID NOT SEND THE PARAGRAPH',
  'SYSTEM ADJUSTMENT: CAT WAS NEARBY',
  'LOYALTY CREDIT: CRIED IN PRIVATE',
  'MYSTERY CREDIT: KEPT GOING SOMEHOW',
] as const

export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function getDailyItem(date: Date = new Date()): CatalogItem {
  const index = hashString(dateKey(date)) % dailyItems.length
  return dailyItems[index]
}

export function getRareAnomaly(receiptNumber: string): string | null {
  const hash = hashString(receiptNumber)
  if (hash % 13 !== 0) return null
  return anomalies[hash % anomalies.length]
}

export function getLiveSummary(items: ReceiptItem[]) {
  const summary = summarizeReceipt(items)
  return {
    itemCount: items.length,
    total: summary.total,
    status: summary.status,
    hasItems: items.length > 0,
  }
}

export function getStickyBarState(items: ReceiptItem[], isPrinterVisible: boolean) {
  const summary = getLiveSummary(items)
  return {
    ...summary,
    actionLabel: isPrinterVisible ? 'PRINTER IN VIEW' : 'VIEW PRINTER',
    shouldStick: summary.hasItems && !isPrinterVisible,
  }
}

export function createShareCopy(items: ReceiptItem[], total: number, themeName: string): string {
  const strongestCharge = items
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0]
  const strongestCredit = items
    .filter((item) => item.amount < 0)
    .sort((a, b) => a.amount - b.amount)[0]

  const parts = [`Today cost $${total.toFixed(2)} according to ${themeName}.`]
  if (strongestCharge) parts.push(`Largest charge: ${strongestCharge.label.toLowerCase()}.`)
  if (strongestCredit) parts.push(`Store credit applied for ${strongestCredit.label.toLowerCase()}.`)
  return parts.join(' ')
}

export function createSavedTransaction(input: Omit<SavedTransaction, 'id' | 'createdAt'>): SavedTransaction {
  return {
    ...input,
    id: `${input.receiptNumber}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
}

export function readHistory(storage: Pick<Storage, 'getItem'> = localStorage): SavedTransaction[] {
  try {
    const raw = storage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : []
  } catch {
    return []
  }
}

export function writeHistory(
  transaction: SavedTransaction,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): SavedTransaction[] {
  const next = [transaction, ...readHistory(storage)]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.receiptNumber === item.receiptNumber) === index)
    .slice(0, MAX_HISTORY)
  storage.setItem(HISTORY_KEY, JSON.stringify(next))
  return next
}

export function getExportDimensions(format: ExportFormat, sourceWidth = 1000, sourceHeight = 1400) {
  if (format === 'share') return { width: 1080, height: 1350 }
  if (format === 'story') return { width: 1080, height: 1920 }
  return { width: sourceWidth, height: sourceHeight }
}
