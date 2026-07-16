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
    navigator.vibrate(6)
  }

  if (preferences.soundEnabled) playInstrumentCue('alignment')
}

export function triggerFieldCaptureFeedback(): void {
  if (typeof window === 'undefined') return
  const preferences = readMachinePreferences()

  if (preferences.hapticsEnabled && typeof navigator.vibrate === 'function') {
    navigator.vibrate(16)
  }

  if (preferences.soundEnabled) playInstrumentCue('capture')
}

export function triggerFieldScanCompleteFeedback(): void {
  if (typeof window === 'undefined') return
  const preferences = readMachinePreferences()

  if (preferences.hapticsEnabled && typeof navigator.vibrate === 'function') {
    navigator.vibrate([8, 34, 12])
  }

  if (preferences.soundEnabled) playInstrumentCue('accepted')
}

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

type InstrumentCue = 'alignment' | 'capture' | 'accepted'

function playInstrumentCue(cue: InstrumentCue): void {
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

    if (cue === 'alignment') {
      scheduleTone(audio, master, now, 740, 560, 0.036, 0.012, 'sine')
      master.gain.exponentialRampToValueAtTime(0.018, now + 0.002)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)
    }

    if (cue === 'capture') {
      scheduleTone(audio, master, now, 178, 118, 0.085, 0.024, 'triangle')
      scheduleTone(audio, master, now + 0.062, 112, 82, 0.11, 0.012, 'sine')
      master.gain.exponentialRampToValueAtTime(0.032, now + 0.004)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.19)
    }

    if (cue === 'accepted') {
      scheduleTone(audio, master, now, 246, 294, 0.16, 0.012, 'sine')
      scheduleTone(audio, master, now + 0.045, 369, 442, 0.2, 0.008, 'sine')
      master.gain.exponentialRampToValueAtTime(0.022, now + 0.008)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.27)
    }

    window.setTimeout(() => void audio.close(), 380)
  } catch {
    // Feedback is optional and must never block the access ritual.
  }
}

function scheduleTone(
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
