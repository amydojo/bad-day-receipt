import { describe, expect, it } from 'vitest'
import { getTheme } from '../themes'
import { createCompletedReceiptSnapshot } from './completedReceipt'
import {
  adoptCompletedReceipt,
  createNewReceiptEndingState,
  createRestoredReceiptEndingState,
  RECEIPT_COMPLETION_PAUSE_MS,
} from './receiptEndingEffects'

const receipt = createCompletedReceiptSnapshot({
  receiptNumber: 'BD-20-0081',
  completedAt: '2026-07-20T12:00:00.000Z',
  theme: getTheme('original'),
  items: [{ id: 'normal', label: 'Trying to act normal', amount: 14, kind: 'charge', quantity: 1 }],
  total: 15.19,
  itemCount: 1,
  status: 'dented but operational',
  anomaly: null,
  shareCopy: 'Local only.',
})

describe('receipt ending initialization', () => {
  it('uses the canonical 700ms completion pause', () => {
    expect(RECEIPT_COMPLETION_PAUSE_MS).toBe(700)
  })

  it('starts a newly printed receipt in settling', () => {
    expect(createNewReceiptEndingState(receipt)).toEqual({
      kind: 'settling',
      receipt,
    })
  })

  it('restores a persisted receipt without replaying settling', () => {
    expect(createRestoredReceiptEndingState(receipt)).toEqual({
      kind: 'documented',
      receipt,
    })
  })

  it('adopts each receipt number only once', () => {
    const current = createNewReceiptEndingState(receipt)
    expect(adoptCompletedReceipt(current, receipt)).toBe(current)
  })
})
