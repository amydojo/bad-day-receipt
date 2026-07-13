import { describe, expect, it } from 'vitest'
import { summarizeReceipt } from './receipt'
import type { ReceiptItem } from './types'

const item = (amount: number): ReceiptItem => ({
  id: String(amount),
  label: 'test',
  amount,
  kind: amount < 0 ? 'credit' : 'charge',
  quantity: 1,
})

describe('summarizeReceipt', () => {
  it('adds emotional tax to charges and subtracts credits', () => {
    const summary = summarizeReceipt([item(20), item(-5)])
    expect(summary.charges).toBe(20)
    expect(summary.credits).toBe(5)
    expect(summary.emotionalTax).toBeCloseTo(1.7)
    expect(summary.total).toBeCloseTo(16.7)
  })

  it('never returns negative damage', () => {
    expect(summarizeReceipt([item(5), item(-20)]).total).toBe(0)
  })
})
