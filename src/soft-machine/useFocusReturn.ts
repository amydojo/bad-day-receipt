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

    const frame = window.requestAnimationFrame(() => {
      const first = getFocusableElements(containerRef.current)[0]
      first?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      returnTarget.current?.focus()
      returnTarget.current = null
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
  ].join(','))).filter((element) => !element.hasAttribute('hidden'))
}
