import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { getFocusableElements, useFocusReturn } from './useFocusReturn'
import { useScrollLock } from './useScrollLock'

interface MachineBottomSheetProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  isolateRef?: RefObject<HTMLElement | null>
  children: ReactNode
}

export function MachineBottomSheet({
  open,
  title,
  description,
  onClose,
  isolateRef,
  children,
}: MachineBottomSheetProps) {
  const titleId = useId()
  const descriptionId = useId()
  const sheetRef = useRef<HTMLElement | null>(null)

  useScrollLock(open)
  useFocusReturn(open, sheetRef)

  useEffect(() => {
    const isolated = isolateRef?.current
    if (!open || !isolated) return
    isolated.setAttribute('inert', '')
    isolated.setAttribute('aria-hidden', 'true')
    return () => {
      isolated.removeAttribute('inert')
      isolated.removeAttribute('aria-hidden')
    }
  }, [isolateRef, open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = getFocusableElements(sheetRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="machine-sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="machine-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="machine-sheet-header">
          <div>
            <span>SOFT MACHINE DRAWER</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
            CLOSE
          </button>
        </header>
        {description && <p className="machine-sheet-description" id={descriptionId}>{description}</p>}
        <div className="machine-sheet-content">{children}</div>
      </section>
    </div>
  )
}
