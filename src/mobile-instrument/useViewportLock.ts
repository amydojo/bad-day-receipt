import { useLayoutEffect } from 'react'

interface ViewportLockStyle {
  position: string
  top: string
  left: string
  right: string
  width: string
  overflow: string
  overscrollBehavior: string
}

export interface ViewportLockEnvironment {
  bodyStyle: ViewportLockStyle
  rootStyle: Pick<ViewportLockStyle, 'overflow' | 'overscrollBehavior'>
  getScrollPosition: () => { x: number; y: number }
  scrollTo: (x: number, y: number) => void
  setLockedAttribute?: (locked: boolean) => void
}

interface ViewportLockSnapshot {
  body: ViewportLockStyle
  root: Pick<ViewportLockStyle, 'overflow' | 'overscrollBehavior'>
  scroll: { x: number; y: number }
}

export interface ViewportLockManager {
  acquire: () => () => void
  getLockCount: () => number
}

function copyBodyStyle(style: ViewportLockStyle): ViewportLockStyle {
  return {
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
    overflow: style.overflow,
    overscrollBehavior: style.overscrollBehavior,
  }
}

function copyRootStyle(
  style: Pick<ViewportLockStyle, 'overflow' | 'overscrollBehavior'>,
) {
  return {
    overflow: style.overflow,
    overscrollBehavior: style.overscrollBehavior,
  }
}

export function createViewportLockManager(
  environment: ViewportLockEnvironment,
): ViewportLockManager {
  let lockCount = 0
  let snapshot: ViewportLockSnapshot | null = null

  const restore = () => {
    if (!snapshot) return

    Object.assign(environment.bodyStyle, snapshot.body)
    Object.assign(environment.rootStyle, snapshot.root)
    environment.setLockedAttribute?.(false)
    environment.scrollTo(snapshot.scroll.x, snapshot.scroll.y)
    snapshot = null
  }

  return {
    acquire() {
      let released = false

      if (lockCount === 0) {
        const scroll = environment.getScrollPosition()
        snapshot = {
          body: copyBodyStyle(environment.bodyStyle),
          root: copyRootStyle(environment.rootStyle),
          scroll,
        }

        environment.bodyStyle.position = 'fixed'
        environment.bodyStyle.top = `-${scroll.y}px`
        environment.bodyStyle.left = '0'
        environment.bodyStyle.right = '0'
        environment.bodyStyle.width = '100%'
        environment.bodyStyle.overflow = 'hidden'
        environment.bodyStyle.overscrollBehavior = 'none'
        environment.rootStyle.overflow = 'hidden'
        environment.rootStyle.overscrollBehavior = 'none'
        environment.setLockedAttribute?.(true)
      }

      lockCount += 1

      return () => {
        if (released) return
        released = true
        lockCount = Math.max(0, lockCount - 1)
        if (lockCount === 0) restore()
      }
    },
    getLockCount() {
      return lockCount
    },
  }
}

let browserManager: ViewportLockManager | null = null

function getBrowserViewportLockManager(): ViewportLockManager | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  if (browserManager) return browserManager

  browserManager = createViewportLockManager({
    bodyStyle: document.body.style,
    rootStyle: document.documentElement.style,
    getScrollPosition: () => ({ x: window.scrollX, y: window.scrollY }),
    scrollTo: (x, y) => window.scrollTo(x, y),
    setLockedAttribute: (locked) => {
      if (locked) document.documentElement.setAttribute('data-mobile-instrument-locked', 'true')
      else document.documentElement.removeAttribute('data-mobile-instrument-locked')
    },
  })

  return browserManager
}

export function useViewportLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return
    return getBrowserViewportLockManager()?.acquire()
  }, [locked])
}
