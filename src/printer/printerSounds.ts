import type { PrinterSoundController } from './printerTypes'

export function tinyHaptic(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function createPrinterSoundController(
  isEnabled: () => boolean,
): PrinterSoundController {
  let context: AudioContext | null = null
  let feedTimer: number | null = null

  const getContext = () => {
    if (!isEnabled() || typeof window === 'undefined') return null
    context ??= new AudioContext()
    void context.resume()
    return context
  }

  const pulse = (
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'square',
  ) => {
    const audio = getContext()
    if (!audio) return

    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const now = audio.currentTime

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000)

    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start(now)
    oscillator.stop(now + duration / 1000)
  }

  return {
    playPress: () => pulse(150, 35, 0.025, 'triangle'),
    playScan: () => pulse(880, 22, 0.018),
    playFeed: () => {
      if (!isEnabled() || feedTimer !== null) return
      pulse(120, 24, 0.014, 'sawtooth')
      feedTimer = window.setInterval(
        () => pulse(135 + Math.random() * 18, 18, 0.012, 'sawtooth'),
        84,
      )
    },
    stopFeed: () => {
      if (feedTimer !== null) {
        window.clearInterval(feedTimer)
        feedTimer = null
      }
    },
    playStamp: () => pulse(76, 65, 0.035, 'triangle'),
    playCouponResume: () => {
      pulse(540, 24, 0.014)
      window.setTimeout(() => pulse(690, 24, 0.012), 48)
    },
  }
}
