import { describe, expect, it } from 'vitest'
import type { CatalogItem, ReceiptItem } from './types'
import {
  getDraftItemCount,
  getDraftSummary,
  setDraftItemQuantity,
  snapshotDraft,
  toggleDraftItem,
} from './draftReceipt'

const charge: CatalogItem = { id: 'charge', label: 'Being perceived', amount: 10, kind: 'charge' }
const credit: CatalogItem = { id: 'credit', label: 'Ate something', amount: -4, kind: 'credit' }

describe('receipt draft operations', () => {
  it('toggles one catalog item without duplicating it', () => {
    const selected = toggleDraftItem([], charge)
    expect(toggleDraftItem(selected, charge)).toEqual([])
  })

  it('updates quantities reversibly and removes at zero', () => {
    const selected = toggleDraftItem([], charge)
    expect(setDraftItemQuantity(selected, charge.id, 3)[0].quantity).toBe(3)
    expect(setDraftItemQuantity(selected, charge.id, 0)).toEqual([])
  })

  it('counts quantities and calculates signed totals through one selector', () => {
    const items: ReceiptItem[] = [
      { ...charge, quantity: 2 },
      { ...credit, quantity: 1 },
    ]
    expect(getDraftItemCount(items)).toBe(3)
    expect(getDraftSummary(items).total).toBeCloseTo(17.7)
  })

  it('creates an atomic copy of the committed draft', () => {
    const source: ReceiptItem[] = [{ ...charge, quantity: 1 }]
    const snapshot = snapshotDraft(source)
    source[0].quantity = 4
    expect(snapshot[0].quantity).toBe(1)
  })
})
