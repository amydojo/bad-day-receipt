interface MachinePreferenceEnvelope {
  data?: {
    preferences?: {
      soundEnabled?: boolean
      hapticsEnabled?: boolean
    }
  }
}

const MACHINE_STORAGE_KEY = 'bad-day-receipt-machine-v1'

export function triggerFieldAlignmentFeedback(): void {
  if (typeof window === 'undefined') return
  const preferences = readMachinePreferences()

  if (preferences.hapticsEnabled && typeof navigator.vibrate === 'function') {
    navigator.vibrate(8)
  }

  if (preferences.soundEnabled) playMechanicalTone('alignment')
}

export function triggerFieldCaptureFeedback(): void {
  if (typeof window === 'undefined') return
  const preferences = readMachinePreferences()

  if (preferences.hapticsEnabled && typeof navigator.vibrate === 'function') {
    navigator.vibrate(24)
  }

  if (preferences.soundEnabled) playMechanicalTone('capture')
}

export function triggerFieldScanCompleteFeedback(): void {
  if (typeof window === 'undefined') return
  const preferences = readMachinePreferences()

  if (preferences.hapticsEnabled && typeof navigator.vibrate === 'function') {
    navigator.vibrate([10, 42, 16])
  }

  if (preferences.soundEnabled) playMechanicalTone('accepted')
}

// Kept for compatibility with earlier callers.
export const triggerFieldInsertionFeedback = triggerFieldCaptureFeedback

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

type MechanicalTone = 'alignment' | 'capture' | 'accepted'

function playMechanicalTone(tone: MechanicalTone): void {
  const audioWindow = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext
  if (!AudioContextConstructor) return

  try {
    const audio = new AudioContextConstructor()
    const now = audio.currentTime
    const master = audio.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.connect(audio.destination)

    if (tone === 'alignment') {
      scheduleOscillator(audio, master, now, 510, 370, 0.028, 0.025, 'square')
      master.gain.exponentialRampToValueAtTime(0.035, now + 0.003)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)
    }

    if (tone === 'capture') {
      scheduleOscillator(audio, master, now, 155, 68, 0.07, 0.075, 'square')
      scheduleOscillator(audio, master, now + 0.085, 92, 54, 0.12, 0.03, 'sawtooth')
      master.gain.exponentialRampToValueAtTime(0.07, now + 0.004)
      master.gain.exponentialRampToValueAtTime(0.018, now + 0.085)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
    }

    if (tone === 'accepted') {
      scheduleOscillator(audio, master, now, 260, 340, 0.09, 0.028, 'sine')
      scheduleOscillator(audio, master, now + 0.09, 390, 480, 0.12, 0.018, 'sine')
      master.gain.exponentialRampToValueAtTime(0.035, now + 0.006)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
    }

    window.setTimeout(() => void audio.close(), 420)
  } catch {
    // Sound is optional; failure must never block access.
  }
}

function scheduleOscillator(
  audio: AudioContext,
  destination: AudioNode,
  start: number,
  fromFrequency: number,
  toFrequency: number,
  duration: number,
  gainValue: number,
  type: OscillatorType,
): void {
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(fromFrequency, start)
  oscillator.frequency.exponentialRampToValueAtTime(toFrequency, start + duration)
  gain.gain.setValueAtTime(gainValue, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(start)
  oscillator.stop(start + duration)
}
