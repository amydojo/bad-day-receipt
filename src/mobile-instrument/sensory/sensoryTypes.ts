export type MachineSensoryEvent =
  | 'register-clack'
  | 'barcode-scan'
  | 'thermal-feed-start'
  | 'thermal-feed-stop'
  | 'verdict-impact'
  | 'cvs-printer-restart'
  | 'machine-complete'
  | 'machine-error'
  | 'receipt-cut'
  | 'archive-align'
  | 'sleeve-receive'
  | 'archive-label'
  | 'archive-close'
  | 'thermal-unprint-start'
  | 'thermal-unprint-complete'
  | 'paper-tension-release'
  | 'release-corner'
  | 'release-close'
  | 'carry-stub-tear'
  | 'carry-intake-start'
  | 'carry-intake-stop'
  | 'actuator-medium'
  | 'actuator-heavy'
  | 'actuator-detent'
  | 'actuator-lock'
  | 'transfer-register'
  | 'transfer-issued'

export interface SensoryPreferences {
  soundEnabled: boolean
  hapticsEnabled: boolean
}

export interface SoundOutput {
  prime: () => Promise<void>
  play: (event: Exclude<MachineSensoryEvent, 'thermal-feed-start' | 'thermal-feed-stop'>) => void
  startFeed: () => void
  stopFeed: () => void
  setEnabled: (enabled: boolean) => void
  dispose: () => void
}

export interface HapticOutput {
  play: (event: MachineSensoryEvent) => void
  setEnabled: (enabled: boolean) => void
  stop: () => void
}

export interface MachineSensoryDirector {
  prime: () => void
  emit: (event: MachineSensoryEvent) => void
  updatePreferences: (preferences: SensoryPreferences) => void
  reset: () => void
  dispose: () => void
}
