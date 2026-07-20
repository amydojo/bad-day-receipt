import { HapticDirector } from './HapticDirector'
import { SoundDirector } from './SoundDirector'
import type {
  HapticOutput,
  MachineSensoryDirector,
  MachineSensoryEvent,
  SensoryPreferences,
  SoundOutput,
} from './sensoryTypes'

const ONCE_PER_TRANSACTION = new Set<MachineSensoryEvent>([
  'register-clack',
  'barcode-scan',
  'verdict-impact',
  'cvs-printer-restart',
  'machine-complete',
  'machine-error',
  'receipt-cut',
  'archive-align',
  'sleeve-receive',
  'archive-label',
  'archive-close',
])

export interface SensoryDirectorDependencies {
  sound?: SoundOutput
  haptics?: HapticOutput
}

export class SensoryDirector implements MachineSensoryDirector {
  private preferences: SensoryPreferences
  private emitted = new Set<MachineSensoryEvent>()
  private feedActive = false
  private disposed = false
  private readonly sound: SoundOutput
  private readonly haptics: HapticOutput

  constructor(
    preferences: SensoryPreferences,
    dependencies: SensoryDirectorDependencies = {},
  ) {
    this.preferences = preferences
    this.sound = dependencies.sound ?? new SoundDirector(preferences.soundEnabled)
    this.haptics = dependencies.haptics ?? new HapticDirector(preferences.hapticsEnabled)
    this.applyPreferences()
  }

  prime(): void {
    if (this.disposed || !this.preferences.soundEnabled) return
    void this.sound.prime().catch(() => undefined)
  }

  emit(event: MachineSensoryEvent): void {
    if (this.disposed) return

    if (event === 'thermal-feed-start') {
      if (this.feedActive) return
      this.feedActive = true
      if (this.preferences.soundEnabled) this.sound.startFeed()
      return
    }

    if (event === 'thermal-feed-stop') {
      this.stopFeed()
      return
    }

    if (ONCE_PER_TRANSACTION.has(event)) {
      if (this.emitted.has(event)) return
      this.emitted.add(event)
    }

    if (this.preferences.soundEnabled) this.sound.play(event)
    if (this.preferences.hapticsEnabled) this.haptics.play(event)
  }

  updatePreferences(preferences: SensoryPreferences): void {
    if (this.disposed) return
    this.preferences = preferences
    this.applyPreferences()
  }

  reset(): void {
    if (this.disposed) return
    this.stopFeed()
    this.haptics.stop()
    this.emitted.clear()
  }

  dispose(): void {
    if (this.disposed) return
    this.reset()
    this.disposed = true
    this.sound.dispose()
  }

  private applyPreferences(): void {
    this.sound.setEnabled(this.preferences.soundEnabled)
    this.haptics.setEnabled(this.preferences.hapticsEnabled)
    if (!this.preferences.soundEnabled) this.stopFeed()
    if (!this.preferences.hapticsEnabled) this.haptics.stop()
  }

  private stopFeed(): void {
    this.feedActive = false
    this.sound.stopFeed()
  }
}

export function createSensoryDirector(
  preferences: SensoryPreferences,
  dependencies?: SensoryDirectorDependencies,
): MachineSensoryDirector {
  return new SensoryDirector(preferences, dependencies)
}
