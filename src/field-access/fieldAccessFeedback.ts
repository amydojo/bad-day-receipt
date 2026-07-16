interface MachinePreferenceEnvelope {
  data?: {
    preferences?: {
      soundEnabled?: boolean
      hapticsEnabled?: boolean
    }
  }
}

const MACHINE_STORAGE_KEY = 'bad-day-receipt-machine-v1'

export function triggerFieldInsertionFeedback(): void {
  if (typeof window === 'undefined') return
  const preferences = readMachinePreferences()

  if (preferences.hapticsEnabled && 'vibrate' in navigator) {
    navigator.vibrate(18)
  }

  if (preferences.soundEnabled) playMechanicalClick()
}

function readMachinePreferences(): {
  soundEnabled: boolean
  hapticsEnabled: boolean
} {
  try {
    const raw = window.localStorage.getItem(MACHINE_STORAGE_KEY)
    if (!raw) return { soundEnabled: false, hapticsEnabled: true }
    const parsed = JSON.parse(raw) as MachinePreferenceEnvelope
    return {
      soundEnabled: parsed.data?.preferences?.soundEnabled === true,
      hapticsEnabled: parsed.data?.preferences?.hapticsEnabled !== false,
    }
  } catch {
    return { soundEnabled: false, hapticsEnabled: true }
  }
}

function playMechanicalClick(): void {
  const AudioContextConstructor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) return

  try {
    const audio = new AudioContextConstructor()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const now = audio.currentTime

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(150, now)
    oscillator.frequency.exponentialRampToValueAtTime(72, now + 0.045)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055)

    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.06)
    oscillator.addEventListener('ended', () => void audio.close(), { once: true })
  } catch {
    // Sound is optional; failure must never block access.
  }
}
