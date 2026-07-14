import type { PrinterPhase } from './printer/printerTypes'

export function isFocusedMachinePhase(phase: PrinterPhase): boolean {
  return !['idle', 'complete', 'error'].includes(phase)
}

export function isReceiptEditingLocked(phase: PrinterPhase): boolean {
  return phase !== 'idle'
}

export function getConciseMachineAnnouncement(phase: PrinterPhase): string {
  switch (phase) {
    case 'arming': return 'Transaction accepted.'
    case 'feeding': return 'Printing receipt.'
    case 'printingCoupons': return 'Additional rewards found.'
    case 'complete': return 'Receipt complete.'
    case 'error': return 'Printer error. The receipt is safe.'
    default: return ''
  }
}
