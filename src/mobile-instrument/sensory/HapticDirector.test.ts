import { describe, expect, it, vi } from 'vitest'
import { HapticDirector } from './HapticDirector'

describe('HapticDirector', () => {
  it('maps only approved machine punctuation to vibration', () => {
    const vibrate = vi.fn(() => true)
    const director = new HapticDirector(true, vibrate)

    director.play('register-clack')
    director.play('barcode-scan')
    director.play('thermal-feed-start')
    director.play('verdict-impact')
    director.play('cvs-printer-restart')

    expect(vibrate).toHaveBeenNthCalledWith(1, 8)
    expect(vibrate).toHaveBeenNthCalledWith(2, 4)
    expect(vibrate).toHaveBeenNthCalledWith(3, 13)
    expect(vibrate).toHaveBeenNthCalledWith(4, [5, 42, 6])
    expect(vibrate).toHaveBeenCalledTimes(4)
  })

  it('stops immediately when disabled', () => {
    const vibrate = vi.fn(() => true)
    const director = new HapticDirector(true, vibrate)

    director.setEnabled(false)
    director.play('verdict-impact')

    expect(vibrate).toHaveBeenCalledWith(0)
    expect(vibrate).toHaveBeenCalledTimes(1)
  })
})
