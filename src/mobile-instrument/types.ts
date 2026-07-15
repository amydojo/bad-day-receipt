import type { ReactNode } from 'react'
import type { PrinterPhase } from '../printer/printerTypes'

export type MobileScene = 'compose' | 'printing' | 'artifact' | 'recovery'

export type InstrumentScrollOwner =
  | 'compose'
  | 'none'
  | 'receipt'
  | 'recovery'
  | 'sheet'

export interface MobileInstrumentProps {
  phase: PrinterPhase
  theme: string
  sheetOpen?: boolean
  className?: string
  children: ReactNode
}

export interface MobileInstrumentSceneProps {
  name: string
  activeWhen: MobileScene | readonly MobileScene[]
  scrollOwner?: InstrumentScrollOwner | Partial<Record<MobileScene, InstrumentScrollOwner>>
  className?: string
  children: ReactNode
}

export interface MobileInstrumentAttributesInput {
  scene: MobileScene
  phase: PrinterPhase
  theme: string
  isMobile: boolean
  standalone: boolean
  reducedMotion: boolean
  sheetOpen: boolean
}

export interface MobileInstrumentEnvironment {
  scene: MobileScene
  isMobile: boolean
  standalone: boolean
  reducedMotion: boolean
  sheetOpen: boolean
}
