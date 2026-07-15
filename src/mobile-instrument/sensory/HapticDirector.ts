import type { HapticOutput, MachineSensoryEvent } from './sensoryTypes'

export type Vibrate = (pattern: number | number[]) => boolean

function browserVibrate(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return false
  return navigator.vibrate(pattern)
}

const HAPTIC_PATTERNS: Partial<Record<MachineSensoryEvent, number | number[]>> = {
  'register-clack': 8,
  'barcode-scan': 4,
  'verdict-impact': 13,
  'cvs-printer-restart': [5, 42, 6],
  'machine-error': [18, 45, 18],
}

export class HapticDirector implements HapticOutput {
  private enabled: boolean

  constructor(enabled: boolean, private readonly vibrate: Vibrate = browserVibrate) {
    this.enabled = enabled
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) this.stop()
  }

  play(event: MachineSensoryEvent): void {
    if (!this.enabled) return
    const pattern = HAPTIC_PATTERNS[event]
    if (pattern === undefined) return
    try {
      this.vibrate(pattern)
    } catch {
      // Vibration is optional and must never affect machine progression.
    }
  }

  stop(): void {
    try {
      this.vibrate(0)
    } catch {
      // Unsupported or interrupted vibration remains silent.
    }
  }
}
