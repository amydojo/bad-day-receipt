import type { PrinterPhase } from '../printer/printerTypes'
import type { InstrumentScrollOwner, MobileScene } from './types'

export function deriveMobileScene(phase: PrinterPhase): MobileScene {
  if (phase === 'idle') return 'compose'
  if (phase === 'complete') return 'artifact'
  if (phase === 'error') return 'recovery'
  return 'printing'
}

export function getSceneScrollOwner(
  scene: MobileScene,
  sheetOpen = false,
): InstrumentScrollOwner {
  if (sheetOpen) return 'sheet'
  if (scene === 'compose') return 'compose'
  if (scene === 'artifact') return 'receipt'
  if (scene === 'recovery') return 'recovery'
  return 'none'
}

export function getMobileSceneAnnouncement(scene: MobileScene): string {
  switch (scene) {
    case 'compose':
      return 'Transaction console ready.'
    case 'printing':
      return 'Transaction accepted. Printing receipt.'
    case 'artifact':
      return 'Receipt complete. Evidence ready.'
    case 'recovery':
      return 'Register jammed. Recovery controls available.'
  }
}
