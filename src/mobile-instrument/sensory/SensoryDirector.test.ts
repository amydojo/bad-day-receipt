import { describe, expect, it, vi } from 'vitest'
import { SensoryDirector } from './SensoryDirector'
import type {
  HapticOutput,
  MachineSensoryEvent,
  SoundOutput,
} from './sensoryTypes'

function makeSound(): SoundOutput & {
  events: MachineSensoryEvent[]
  feedStarts: number
  feedStops: number
} {
  const output = {
    events: [] as MachineSensoryEvent[],
    feedStarts: 0,
    feedStops: 0,
    prime: vi.fn(async () => undefined),
    play(event: Exclude<MachineSensoryEvent, 'thermal-feed-start' | 'thermal-feed-stop'>) {
      output.events.push(event)
    },
    startFeed() {
      output.feedStarts += 1
    },
    stopFeed() {
      output.feedStops += 1
    },
    setEnabled: vi.fn(),
    dispose: vi.fn(),
  }
  return output
}

function makeHaptics(): HapticOutput & { events: MachineSensoryEvent[]; stops: number } {
  const output = {
    events: [] as MachineSensoryEvent[],
    stops: 0,
    play(event: MachineSensoryEvent) {
      output.events.push(event)
    },
    setEnabled: vi.fn(),
    stop() {
      output.stops += 1
    },
  }
  return output
}

describe('SensoryDirector', () => {
  it('keeps sound and haptics silent when preferences are disabled', () => {
    const sound = makeSound()
    const haptics = makeHaptics()
    const director = new SensoryDirector(
      { soundEnabled: false, hapticsEnabled: false },
      { sound, haptics },
    )

    director.prime()
    director.emit('register-clack')
    director.emit('thermal-feed-start')
    director.emit('verdict-impact')

    expect(sound.prime).not.toHaveBeenCalled()
    expect(sound.events).toEqual([])
    expect(sound.feedStarts).toBe(0)
    expect(haptics.events).toEqual([])
  })

  it('emits each punctuation event once per transaction', () => {
    const sound = makeSound()
    const haptics = makeHaptics()
    const director = new SensoryDirector(
      { soundEnabled: true, hapticsEnabled: true },
      { sound, haptics },
    )

    director.emit('barcode-scan')
    director.emit('barcode-scan')
    director.emit('verdict-impact')
    director.emit('verdict-impact')

    expect(sound.events).toEqual(['barcode-scan', 'verdict-impact'])
    expect(haptics.events).toEqual(['barcode-scan', 'verdict-impact'])

    director.reset()
    director.emit('barcode-scan')
    expect(sound.events).toEqual(['barcode-scan', 'verdict-impact', 'barcode-scan'])
  })

  it('starts one feed loop and stops it on preference change and reset', () => {
    const sound = makeSound()
    const haptics = makeHaptics()
    const director = new SensoryDirector(
      { soundEnabled: true, hapticsEnabled: true },
      { sound, haptics },
    )

    director.emit('thermal-feed-start')
    director.emit('thermal-feed-start')
    expect(sound.feedStarts).toBe(1)

    director.updatePreferences({ soundEnabled: false, hapticsEnabled: true })
    expect(sound.feedStops).toBeGreaterThanOrEqual(1)

    director.updatePreferences({ soundEnabled: true, hapticsEnabled: true })
    director.emit('thermal-feed-start')
    expect(sound.feedStarts).toBe(2)

    director.reset()
    expect(sound.feedStops).toBeGreaterThanOrEqual(2)
  })

  it('contains audio failures and disposes all outputs', () => {
    const sound = makeSound()
    sound.prime = vi.fn(async () => Promise.reject(new Error('decode failed')))
    const haptics = makeHaptics()
    const director = new SensoryDirector(
      { soundEnabled: true, hapticsEnabled: true },
      { sound, haptics },
    )

    expect(() => director.prime()).not.toThrow()
    expect(() => director.emit('machine-error')).not.toThrow()
    expect(() => director.dispose()).not.toThrow()
    expect(sound.dispose).toHaveBeenCalledOnce()
  })
})
