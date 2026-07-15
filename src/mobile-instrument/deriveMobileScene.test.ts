import { describe, expect, it } from 'vitest'
import type { PrinterPhase } from '../printer/printerTypes'
import {
  deriveMobileScene,
  getMobileSceneAnnouncement,
  getSceneScrollOwner,
} from './deriveMobileScene'

const printingPhases: PrinterPhase[] = [
  'arming',
  'scanning',
  'calculating',
  'feeding',
  'stamping',
  'falseComplete',
  'printingCoupons',
]

describe('mobile scene derivation', () => {
  it('maps steady printer phases without introducing mutable scene state', () => {
    expect(deriveMobileScene('idle')).toBe('compose')
    expect(deriveMobileScene('complete')).toBe('artifact')
    expect(deriveMobileScene('error')).toBe('recovery')

    for (const phase of printingPhases) {
      expect(deriveMobileScene(phase)).toBe('printing')
    }
  })

  it('assigns exactly one scroll owner to each scene', () => {
    expect(getSceneScrollOwner('compose')).toBe('compose')
    expect(getSceneScrollOwner('printing')).toBe('none')
    expect(getSceneScrollOwner('artifact')).toBe('receipt')
    expect(getSceneScrollOwner('recovery')).toBe('recovery')
    expect(getSceneScrollOwner('artifact', true)).toBe('sheet')
  })

  it('announces scene milestones rather than every printer phase', () => {
    expect(getMobileSceneAnnouncement('compose')).toContain('ready')
    expect(getMobileSceneAnnouncement('printing')).toContain('Printing')
    expect(getMobileSceneAnnouncement('artifact')).toContain('complete')
    expect(getMobileSceneAnnouncement('recovery')).toContain('Recovery')
  })
})
