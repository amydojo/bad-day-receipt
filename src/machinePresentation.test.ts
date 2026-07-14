import { describe, expect, it } from 'vitest'
import type { PrinterPhase } from './printer/printerTypes'
import {
  getConciseMachineAnnouncement,
  isFocusedMachinePhase,
  isReceiptEditingLocked,
} from './machinePresentation'

const legalPhases: PrinterPhase[] = [
  'idle',
  'arming',
  'scanning',
  'calculating',
  'feeding',
  'stamping',
  'falseComplete',
  'printingCoupons',
  'complete',
  'error',
]

describe('mobile machine presentation', () => {
  it('focuses only active processing phases', () => {
    expect(isFocusedMachinePhase('idle')).toBe(false)
    expect(isFocusedMachinePhase('feeding')).toBe(true)
    expect(isFocusedMachinePhase('printingCoupons')).toBe(true)
    expect(isFocusedMachinePhase('complete')).toBe(false)
  })

  it('locks editing for every issued or processing state', () => {
    expect(legalPhases.filter(isReceiptEditingLocked)).not.toContain('idle')
    expect(isReceiptEditingLocked('complete')).toBe(true)
  })

  it('announces only meaningful milestones', () => {
    expect(getConciseMachineAnnouncement('arming')).toBe('Transaction accepted.')
    expect(getConciseMachineAnnouncement('scanning')).toBe('')
    expect(getConciseMachineAnnouncement('feeding')).toBe('Printing receipt.')
    expect(getConciseMachineAnnouncement('printingCoupons')).toBe('Additional rewards found.')
    expect(getConciseMachineAnnouncement('complete')).toBe('Receipt complete.')
  })
})
