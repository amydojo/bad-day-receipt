export type MachineSheetId = 'paper' | 'history' | 'settings' | 'export'
export type MachineSheetPresentation = 'bottom-sheet' | 'side-panel'

export function getMachineSheetPresentation(width: number): MachineSheetPresentation {
  return width < 1100 ? 'bottom-sheet' : 'side-panel'
}

export function getMachineSheetTitle(sheet: MachineSheetId): string {
  switch (sheet) {
    case 'paper': return 'Choose paper stock'
    case 'history': return 'Local transaction drawer'
    case 'settings': return 'Machine settings'
    case 'export': return 'Save receipt formats'
  }
}
