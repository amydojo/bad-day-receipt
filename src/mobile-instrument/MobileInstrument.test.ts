import { describe, expect, it } from 'vitest'
import { getMobileInstrumentAttributes } from './MobileInstrument'

describe('Mobile Instrument shell contract', () => {
  it('exposes stable scene, environment, and scroll-owner attributes', () => {
    expect(getMobileInstrumentAttributes({
      scene: 'printing',
      phase: 'feeding',
      theme: 'cvs',
      isMobile: true,
      standalone: true,
      reducedMotion: false,
      sheetOpen: false,
    })).toEqual({
      'data-mobile-scene': 'printing',
      'data-phase': 'feeding',
      'data-theme': 'cvs',
      'data-mobile': true,
      'data-standalone': true,
      'data-reduced-motion': false,
      'data-sheet-open': false,
      'data-scroll-owner': 'none',
    })
  })

  it('hands scroll ownership to an open machine sheet', () => {
    expect(getMobileInstrumentAttributes({
      scene: 'artifact',
      phase: 'complete',
      theme: 'original',
      isMobile: true,
      standalone: false,
      reducedMotion: true,
      sheetOpen: true,
    })['data-scroll-owner']).toBe('sheet')
  })
})
