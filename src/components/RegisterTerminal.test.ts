import { describe, expect, it } from 'vitest'
import { getTheme } from '../themes'
import type { ReceiptItem } from '../types'
import {
  getMachineGeometry,
  getPhysicalPrintContract,
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

  it('mounts blank paper during arming with printed content hidden', () => {
    expect(getPhysicalPrintContract('arming')).toMatchObject({
      receiptMounted: true,
      blankTipOnly: true,
      printedContentVisible: false,
      couponTailMounted: false,
      cvsBandVisible: false,
    })
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

  it('pulls the receipt viewport into the chassis and keeps a blank leader first', () => {
    const contract = getPhysicalPrintContract('arming')
    expect(contract.viewportOverlap).toBeGreaterThanOrEqual(30)
    expect(contract.blankLeaderHeight).toBeGreaterThanOrEqual(30)
    expect(contract.cvsBlankLeaderHeight).toBeGreaterThan(contract.blankLeaderHeight)
  })

  it('uses a full-width paper contact treatment with soft edges', () => {
    const contract = getPhysicalPrintContract('arming')
    expect(contract.topReceiptTeethMounted).toBe(false)
    expect(contract.contactShadowInset).toBe(0)
    expect(contract.pressureShadowInset).toBe(0)
    expect(contract.contactShadowMatchesPaperWidth).toBe(true)
    expect(contract.contactShadowHasEdgeFade).toBe(true)
  })

  it('keeps the contact layer narrower than the slot because the paper is narrower', () => {
    const { slot, receipt } = getMachineGeometry()
    expect(receipt).toBeLessThan(slot)
    expect(getPhysicalPrintContract('feeding').contactShadowMatchesPaperWidth).toBe(true)
  })

  it('shows contact pressure only while paper is actively moving', () => {
    expect(getPhysicalPrintContract('arming').contactOverlaysVisible).toBe(true)
    expect(getPhysicalPrintContract('feeding').contactOverlaysVisible).toBe(true)
    expect(getPhysicalPrintContract('printingCoupons').contactOverlaysVisible).toBe(true)
    expect(getPhysicalPrintContract('stamping').contactOverlaysVisible).toBe(false)
    expect(getPhysicalPrintContract('falseComplete').contactOverlaysVisible).toBe(false)
    expect(getPhysicalPrintContract('complete').contactOverlaysVisible).toBe(false)
  })

  it('uses a slot lip overlap that physically covers the paper edge', () => {
    expect(getPhysicalPrintContract('arming').slotLipOverlap).toBeGreaterThanOrEqual(8)
    expect(getPhysicalPrintContract('arming').slotLipOverlap).toBeLessThanOrEqual(12)
  })

  it('reveals the CVS registration band only after the blank leader', () => {
    expect(getPhysicalPrintContract('arming').cvsBandVisible).toBe(false)
    expect(getPhysicalPrintContract('scanning').cvsBandVisible).toBe(true)
  })

  it('keeps the CVS coupon tail absent until the second feed', () => {
    expect(getPhysicalPrintContract('falseComplete').couponTailMounted).toBe(false)
    expect(getTerminalStatus('falseComplete')).toBe('PRINT COMPLETE')
    expect(getTerminalStatus('printingCoupons')).toBe('ADDITIONAL REWARDS FOUND')
    expect(getPhysicalPrintContract('printingCoupons').couponTailMounted).toBe(true)
  })

  it('keeps reduced motion completion below 250ms', () => {
    expect(getPhysicalPrintContract('arming').reducedMotionDuration).toBeLessThan(250)
  })
})
