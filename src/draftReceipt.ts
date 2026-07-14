import { summarizeReceipt } from './receipt'
import type { CatalogItem, ReceiptItem } from './types'

export function toggleDraftItem(items: ReceiptItem[], catalogItem: CatalogItem): ReceiptItem[] {
  const exists = items.some((item) => item.id === catalogItem.id)
  if (exists) return items.filter((item) => item.id !== catalogItem.id)
  return [...items, { ...catalogItem, quantity: 1 }]
}

export function setDraftItemQuantity(
  items: ReceiptItem[],
  itemId: string,
  quantity: number,
): ReceiptItem[] {
  if (quantity <= 0) return items.filter((item) => item.id !== itemId)
  return items.map((item) => (
    item.id === itemId ? { ...item, quantity: Math.min(quantity, 9) } : item
  ))
}

export function getDraftItemCount(items: ReceiptItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0)
}

export function getDraftSummary(items: ReceiptItem[]) {
  return {
    itemCount: getDraftItemCount(items),
    ...summarizeReceipt(items),
  }
}

export function snapshotDraft(items: ReceiptItem[]): ReceiptItem[] {
  return items.map((item) => ({ ...item }))
}
