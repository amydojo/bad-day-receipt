import { describe, expect, it } from 'vitest'
import { getMachineSheetPresentation, getMachineSheetTitle } from './sheetState'

describe('machine sheet contracts', () => {
  it('adapts presentation at workbench width', () => {
    expect(getMachineSheetPresentation(320)).toBe('bottom-sheet')
    expect(getMachineSheetPresentation(768)).toBe('bottom-sheet')
    expect(getMachineSheetPresentation(1099)).toBe('bottom-sheet')
    expect(getMachineSheetPresentation(1100)).toBe('side-panel')
  })

  it('provides stable accessible titles', () => {
    expect(getMachineSheetTitle('paper')).toBe('Choose paper stock')
    expect(getMachineSheetTitle('history')).toBe('Local transaction drawer')
    expect(getMachineSheetTitle('settings')).toBe('Machine settings')
    expect(getMachineSheetTitle('export')).toBe('Save receipt formats')
  })
})
