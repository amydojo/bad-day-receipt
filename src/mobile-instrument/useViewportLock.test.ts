import { describe, expect, it } from 'vitest'
import { createViewportLockManager } from './useViewportLock'

describe('viewport lock manager', () => {
  it('locks once, supports nested consumers, and restores every style', () => {
    const bodyStyle = {
      position: 'relative',
      top: '4px',
      left: '2px',
      right: '3px',
      width: '88%',
      overflow: 'auto',
      overscrollBehavior: 'contain',
    }
    const rootStyle = {
      overflow: 'visible',
      overscrollBehavior: 'auto',
    }
    const scrollCalls: Array<[number, number]> = []
    const lockedStates: boolean[] = []

    const manager = createViewportLockManager({
      bodyStyle,
      rootStyle,
      getScrollPosition: () => ({ x: 12, y: 240 }),
      scrollTo: (x, y) => scrollCalls.push([x, y]),
      setLockedAttribute: (locked) => lockedStates.push(locked),
    })

    const releaseInstrument = manager.acquire()
    const releaseSheet = manager.acquire()

    expect(manager.getLockCount()).toBe(2)
    expect(bodyStyle).toMatchObject({
      position: 'fixed',
      top: '-240px',
      left: '0',
      right: '0',
      width: '100%',
      overflow: 'hidden',
      overscrollBehavior: 'none',
    })
    expect(rootStyle).toEqual({ overflow: 'hidden', overscrollBehavior: 'none' })

    releaseSheet()
    expect(manager.getLockCount()).toBe(1)
    expect(bodyStyle.position).toBe('fixed')
    expect(scrollCalls).toEqual([])

    releaseInstrument()
    releaseInstrument()

    expect(manager.getLockCount()).toBe(0)
    expect(bodyStyle).toEqual({
      position: 'relative',
      top: '4px',
      left: '2px',
      right: '3px',
      width: '88%',
      overflow: 'auto',
      overscrollBehavior: 'contain',
    })
    expect(rootStyle).toEqual({ overflow: 'visible', overscrollBehavior: 'auto' })
    expect(scrollCalls).toEqual([[12, 240]])
    expect(lockedStates).toEqual([true, false])
  })
})
