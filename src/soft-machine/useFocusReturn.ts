import { useEffect, useRef, type RefObject } from 'react'

export function useFocusReturn(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
) {
  const returnTarget = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnTarget.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    const focusFrame = window.requestAnimationFrame(() => {
      const first = getFocusableElements(containerRef.current)[0]
      first?.focus()
    })

    return () => {
      window.cancelAnimationFrame(focusFrame)
      const target = returnTarget.current
      returnTarget.current = null
      window.setTimeout(() => target?.focus(), 0)
    }
  }, [containerRef, open])
}

export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>([
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(','))).filter((element) => (
    !element.hasAttribute('hidden')
    && element.getAttribute('aria-hidden') !== 'true'
  ))
}
