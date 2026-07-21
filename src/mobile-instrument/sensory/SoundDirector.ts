import type { MachineSensoryEvent, SoundOutput } from './sensoryTypes'

type OneShotEvent = Exclude<MachineSensoryEvent, 'thermal-feed-start' | 'thermal-feed-stop'>

type AudioContextConstructor = new () => AudioContext

const MASTER_VOLUME = 0.16
const FEED_VOLUME = 0.11

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null
  const browserWindow = window as Window & {
    webkitAudioContext?: AudioContextConstructor
  }
  return window.AudioContext ?? browserWindow.webkitAudioContext ?? null
}

function deterministicNoise(index: number, seed: number): number {
  const value = Math.sin((index + seed) * 12.9898) * 43758.5453
  return ((value - Math.floor(value)) * 2) - 1
}

function createBuffer(
  context: AudioContext,
  durationSeconds: number,
  render: (time: number, index: number, length: number) => number,
): AudioBuffer {
  const length = Math.max(1, Math.ceil(context.sampleRate * durationSeconds))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) {
    channel[index] = Math.max(-1, Math.min(1, render(index / context.sampleRate, index, length)))
  }
  return buffer
}

function decayEnvelope(index: number, length: number, power = 3): number {
  return Math.pow(1 - index / Math.max(1, length - 1), power)
}

function restrainedContact(
  context: AudioContext,
  {
    duration,
    frequency,
    noise,
    seed,
    power = 3.5,
  }: {
    duration: number
    frequency: number
    noise: number
    seed: number
    power?: number
  },
): AudioBuffer {
  return createBuffer(context, duration, (time, index, length) => {
    const envelope = decayEnvelope(index, length, power)
    const body = Math.sin(2 * Math.PI * frequency * time) * 0.22
    return (body + deterministicNoise(index, seed) * noise) * envelope
  })
}

function renderOneShot(context: AudioContext, event: OneShotEvent): AudioBuffer | null {
  switch (event) {
    case 'register-clack':
      return createBuffer(context, 0.065, (time, index, length) => {
        const envelope = decayEnvelope(index, length, 4)
        const body = Math.sin(2 * Math.PI * 118 * time) * 0.34
        const contact = deterministicNoise(index, 11) * 0.44
        return (body + contact) * envelope
      })
    case 'barcode-scan':
      return createBuffer(context, 0.055, (time, index, length) => {
        const progress = index / Math.max(1, length - 1)
        const envelope = Math.sin(Math.PI * progress)
        const frequency = 760 + 430 * progress
        return Math.sin(2 * Math.PI * frequency * time) * envelope * 0.32
      })
    case 'verdict-impact':
      return createBuffer(context, 0.105, (time, index, length) => {
        const envelope = decayEnvelope(index, length, 3.2)
        const body = Math.sin(2 * Math.PI * 72 * time) * 0.46
        const paper = deterministicNoise(index, 29) * 0.24
        return (body + paper) * envelope
      })
    case 'receipt-cut':
      return createBuffer(context, 0.052, (_time, index, length) => {
        const envelope = decayEnvelope(index, length, 5)
        return deterministicNoise(index, 113) * envelope * 0.34
      })
    case 'archive-align':
      return createBuffer(context, 0.038, (time, index, length) => {
        const envelope = decayEnvelope(index, length, 5)
        return (
          Math.sin(2 * Math.PI * 230 * time) * 0.2
          + deterministicNoise(index, 127) * 0.12
        ) * envelope
      })
    case 'sleeve-receive':
      return createBuffer(context, 0.12, (_time, index, length) => {
        const progress = index / Math.max(1, length - 1)
        const envelope = Math.pow(Math.sin(Math.PI * progress), 1.6)
        return deterministicNoise(index, 149) * envelope * 0.12
      })
    case 'archive-label':
      return createBuffer(context, 0.09, (time, index, length) => {
        const envelope = decayEnvelope(index, length, 2.4)
        const roller = Math.sin(2 * Math.PI * 138 * time) * 0.08
        const rasp = deterministicNoise(index, 173) * 0.16
        return (roller + rasp) * envelope
      })
    case 'archive-close':
      return createBuffer(context, 0.11, (time, index, length) => {
        const envelope = decayEnvelope(index, length, 3.4)
        const body = Math.sin(2 * Math.PI * 66 * time) * 0.32
        const contact = deterministicNoise(index, 191) * 0.18
        return (body + contact) * envelope
      })
    case 'thermal-unprint-start':
      return createBuffer(context, 0.085, (_time, index, length) => {
        const progress = index / Math.max(1, length - 1)
        const envelope = Math.pow(Math.sin(Math.PI * progress), 1.8)
        return deterministicNoise(index, 211) * envelope * 0.1
      })
    case 'thermal-unprint-complete':
      return restrainedContact(context, { duration: 0.05, frequency: 84, noise: 0.05, seed: 219, power: 4.5 })
    case 'paper-tension-release':
      return createBuffer(context, 0.12, (time, index, length) => {
        const envelope = decayEnvelope(index, length, 2.2)
        const body = Math.sin(2 * Math.PI * 46 * time) * 0.1
        const paper = deterministicNoise(index, 233) * 0.08
        return (body + paper) * envelope
      })
    case 'release-corner':
      return createBuffer(context, 0.04, (_time, index, length) => (
        deterministicNoise(index, 257) * decayEnvelope(index, length, 5) * 0.12
      ))
    case 'release-close':
      return createBuffer(context, 0.095, (time, index, length) => {
        const envelope = decayEnvelope(index, length, 3.6)
        const body = Math.sin(2 * Math.PI * 58 * time) * 0.22
        const contact = deterministicNoise(index, 281) * 0.12
        return (body + contact) * envelope
      })
    case 'carry-stub-tear':
      return createBuffer(context, 0.075, (_time, index, length) => (
        deterministicNoise(index, 307) * decayEnvelope(index, length, 4.2) * 0.2
      ))
    case 'carry-intake-start':
      return createBuffer(context, 0.11, (time, index, length) => {
        const progress = index / Math.max(1, length - 1)
        const envelope = Math.pow(Math.sin(Math.PI * progress), 1.8)
        return (
          Math.sin(2 * Math.PI * 88 * time) * 0.08
          + deterministicNoise(index, 331) * 0.07
        ) * envelope
      })
    case 'carry-intake-stop':
      return restrainedContact(context, { duration: 0.055, frequency: 76, noise: 0.06, seed: 347, power: 4 })
    case 'actuator-medium':
      return restrainedContact(context, { duration: 0.045, frequency: 92, noise: 0.04, seed: 359, power: 4 })
    case 'actuator-heavy':
      return restrainedContact(context, { duration: 0.055, frequency: 72, noise: 0.06, seed: 373, power: 3.8 })
    case 'actuator-detent':
      return restrainedContact(context, { duration: 0.06, frequency: 104, noise: 0.08, seed: 389, power: 4.5 })
    case 'actuator-lock':
      return restrainedContact(context, { duration: 0.085, frequency: 61, noise: 0.1, seed: 401, power: 3.7 })
    case 'transfer-register':
      return restrainedContact(context, { duration: 0.07, frequency: 137, noise: 0.05, seed: 419, power: 3.8 })
    case 'transfer-issued':
      return createBuffer(context, 0.09, (_time, index, length) => {
        const progress = index / Math.max(1, length - 1)
        return deterministicNoise(index, 433) * Math.pow(Math.sin(Math.PI * progress), 2) * 0.07
      })
    case 'cvs-printer-restart':
      return createBuffer(context, 0.16, (time, index, length) => {
        const first = time < 0.045
          ? Math.sin(2 * Math.PI * 420 * time) * decayEnvelope(index, Math.ceil(length * 0.3), 3)
          : 0
        const secondTime = time - 0.082
        const secondIndex = Math.max(0, index - Math.floor(context.sampleRate * 0.082))
        const secondLength = Math.max(1, length - Math.floor(context.sampleRate * 0.082))
        const second = secondTime >= 0
          ? Math.sin(2 * Math.PI * 610 * secondTime) * decayEnvelope(secondIndex, secondLength, 4)
          : 0
        return (first * 0.24) + (second * 0.2)
      })
    case 'machine-error':
      return createBuffer(context, 0.18, (time, index, length) => {
        const envelope = decayEnvelope(index, length, 2.5)
        return Math.sin(2 * Math.PI * 54 * time) * envelope * 0.22
      })
    case 'machine-complete':
      return null
  }
}

function renderFeedLoop(context: AudioContext): AudioBuffer {
  return createBuffer(context, 0.12, (time, index, length) => {
    const progress = index / Math.max(1, length - 1)
    const seamEnvelope = Math.pow(Math.sin(Math.PI * progress), 1.5)
    const roller = Math.sin(2 * Math.PI * 92 * time) * 0.1
    const tooth = Math.sin(2 * Math.PI * 184 * time) * 0.045
    const paper = deterministicNoise(index, 71) * 0.08
    return (roller + tooth + paper) * seamEnvelope
  })
}

export class SoundDirector implements SoundOutput {
  private enabled: boolean
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private buffers = new Map<string, AudioBuffer>()
  private activeSources = new Set<AudioBufferSourceNode>()
  private feedSource: AudioBufferSourceNode | null = null

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) this.stopAll()
  }

  async prime(): Promise<void> {
    const context = this.getContext()
    if (!context) return
    try {
      if (context.state === 'suspended') await context.resume()
    } catch {
      // Audio is progressive enhancement. Visual progression remains authoritative.
    }
  }

  play(event: OneShotEvent): void {
    if (!this.enabled || event === 'machine-complete') return
    void this.playOneShot(event)
  }

  startFeed(): void {
    if (!this.enabled || this.feedSource) return
    const context = this.getContext()
    if (!context) return
    const buffer = this.buffers.get('thermal-feed-loop') ?? renderFeedLoop(context)
    this.buffers.set('thermal-feed-loop', buffer)

    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    source.loop = true
    gain.gain.setValueAtTime(FEED_VOLUME, context.currentTime)
    source.connect(gain)
    gain.connect(this.getMaster(context))
    source.start()
    this.feedSource = source
    this.activeSources.add(source)
    source.onended = () => {
      this.activeSources.delete(source)
      if (this.feedSource === source) this.feedSource = null
      source.disconnect()
      gain.disconnect()
    }
  }

  stopFeed(): void {
    const source = this.feedSource
    if (!source) return
    this.feedSource = null
    try {
      source.stop()
    } catch {
      // A source may already have ended during browser audio interruption.
    }
  }

  dispose(): void {
    this.stopAll()
    const context = this.context
    this.context = null
    this.master = null
    this.buffers.clear()
    if (context && context.state !== 'closed') void context.close().catch(() => undefined)
  }

  private async playOneShot(event: OneShotEvent): Promise<void> {
    const context = this.getContext()
    if (!context) return
    try {
      if (context.state === 'suspended') await context.resume()
    } catch {
      return
    }
    if (!this.enabled) return

    const buffer = this.buffers.get(event) ?? renderOneShot(context, event)
    if (!buffer) return
    this.buffers.set(event, buffer)

    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.setValueAtTime(MASTER_VOLUME, context.currentTime)
    source.connect(gain)
    gain.connect(this.getMaster(context))
    this.activeSources.add(source)
    source.onended = () => {
      this.activeSources.delete(source)
      source.disconnect()
      gain.disconnect()
    }
    source.start()
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null
    if (this.context) return this.context
    const Constructor = getAudioContextConstructor()
    if (!Constructor) return null
    try {
      this.context = new Constructor()
      return this.context
    } catch {
      return null
    }
  }

  private getMaster(context: AudioContext): GainNode {
    if (this.master) return this.master
    const master = context.createGain()
    master.gain.setValueAtTime(1, context.currentTime)
    master.connect(context.destination)
    this.master = master
    return master
  }

  private stopAll(): void {
    this.stopFeed()
    for (const source of this.activeSources) {
      try {
        source.stop()
      } catch {
        // Already stopped.
      }
    }
    this.activeSources.clear()
  }
}
