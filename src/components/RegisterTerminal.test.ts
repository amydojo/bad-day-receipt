import { describe, expect, it } from 'vitest'
import { getTheme } from '../themes'
import type { ReceiptItem } from '../types'
import {
  getMachineGeometry,
  getTerminalSnapshot,
  getTerminalStatus,
  shouldRenderIssuedReceipt,
} from './RegisterTerminal'

const items: ReceiptItem[] = [
  { id: 'normal', label: 'Trying to act normal', amount: 14, kind: 'charge', quantity: 1 },
  { id: 'food', label: 'Ate something', amount: -6, kind: 'credit', quantity: 1 },
]

describe('register terminal reveal contract', () => {
  it('hides the issued receipt while the transaction is idle', () => {
    expect(shouldRenderIssuedReceipt('idle')).toBe(false)
    expect(shouldRenderIssuedReceipt('arming')).toBe(true)
  })

  it('shows live item count, total, paper stock, and uncommitted status', () => {
    const snapshot = getTerminalSnapshot(items, getTheme('cvs'), 'idle')
    expect(snapshot.itemLabel).toBe('ITEMS 02')
    expect(snapshot.totalLabel).toBe('$9.19')
    expect(snapshot.paperLabel).toBe('PAPER: CVS')
    expect(snapshot.status).toBe('UNCOMMITTED')
  })

  it('moves through accepted, sending, and printing states', () => {
    expect(getTerminalStatus('arming')).toBe('TRANSACTION ACCEPTED')
    expect(getTerminalStatus('scanning')).toBe('SENDING TO PRINTER')
    expect(getTerminalStatus('feeding')).toBe('PRINTING RECEIPT')
  })

  it('keeps machine wider than slot and slot wider than receipt', () => {
    const { machine, slot, receipt } = getMachineGeometry()
    expect(machine).toBeGreaterThan(slot)
    expect(slot).toBeGreaterThan(receipt)
  })

  it('announces the CVS reward continuation phase', () => {
    expect(getTerminalStatus('falseComplete')).toBe('PRINT COMPLETE')
    expect(getTerminalStatus('printingCoupons')).toBe('ADDITIONAL REWARDS FOUND')
  })
})
