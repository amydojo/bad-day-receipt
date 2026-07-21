import {
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { CARRY_RITUAL_MOTION, getStubRotation } from './carryForwardRitualMotion'
import {
  clampUnit,
  shouldCaptureStub,
  shouldSeparateStub,
} from './carryForwardRitualThresholds'
import type { CarryRitualPhase } from './carryForwardRitualTypes'

export function CarryForwardStub({
  phase,
  stubId,
  obligation,
  children,
  onStartTear,
  onSeparate,
  onTearReleasedEarly,
  onStartAlignment,
  onIntakeJam,
}: {
  phase: CarryRitualPhase
  stubId: string
  obligation: string
  children?: ReactNode
  onStartTear: () => void
  onSeparate: () => void
  onTearReleasedEarly: () => void
  onStartAlignment: () => void
  onIntakeJam: () => void
}) {
  const stubRef = useRef<HTMLElement | null>(null)
  const gesture = useRef<{
    pointerId: number
    mode: 'tear' | 'intake'
    startX: number
    startY: number
    progress: number
    completed: boolean
  } | null>(null)

  const isAttached = phase === 'extension-printing'
    || phase === 'extension-ready'
    || phase === 'tear-tension'
  const isSeparated = phase === 'stub-separated'
  const isTransfer = phase === 'transform-registering'
    || phase === 'transfer-issuing'
    || phase === 'transfer-issued'

  const setProgress = (mode: 'tear' | 'intake', progress: number) => {
    const node = stubRef.current
    if (!node) return
    node.style.setProperty(
      mode === 'tear' ? '--carry-tear-progress' : '--carry-intake-progress',
      String(clampUnit(progress)),
    )
  }

  const beginGesture = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    const mode = isAttached ? 'tear' : isSeparated ? 'intake' : null
    if (!mode) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      progress: 0,
      completed: false,
    }
    if (mode === 'tear') onStartTear()
  }

  const moveGesture = (event: ReactPointerEvent<HTMLElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId || active.completed) return
    const distance = active.mode === 'tear'
      ? Math.hypot(event.clientX - active.startX, event.clientY - active.startY)
      : Math.max(0, active.startY - event.clientY)
    const travel = active.mode === 'tear'
      ? CARRY_RITUAL_MOTION.tearDistancePx
      : CARRY_RITUAL_MOTION.intakeDistancePx
    const progress = clampUnit(distance / travel)
    active.progress = progress
    setProgress(active.mode, progress)

    if (active.mode === 'tear' && shouldSeparateStub(progress)) {
      active.completed = true
      onSeparate()
    }
    if (active.mode === 'intake' && shouldCaptureStub(progress)) {
      active.completed = true
      onStartAlignment()
    }
  }

  const endGesture = (event: ReactPointerEvent<HTMLElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (active.completed) return
    setProgress(active.mode, 0)
    if (active.mode === 'tear') {
      onTearReleasedEarly()
      return
    }
    if (active.progress > 0.18) onIntakeJam()
  }

  const tearByControl = () => {
    onStartTear()
    onSeparate()
  }

  return (
    <article
      ref={stubRef}
      id={stubId}
      className="carry-stub"
      data-carry-forward-stub
      data-stub-id={stubId}
      data-stub-phase={phase}
      data-stub-attached={isAttached || undefined}
      data-stub-separated={isSeparated || undefined}
      data-stub-transfer={isTransfer || undefined}
      style={{ '--carry-stub-rotation': `${getStubRotation(stubId)}deg` } as CSSProperties}
      onPointerDown={beginGesture}
      onPointerMove={moveGesture}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      <div className="carry-stub__registration" aria-hidden="true">
        <span />
        <span />
      </div>
      {children ?? (
        <div className="carry-stub__paper">
          <p className="carry-stub__serial">CARRY FORWARD STUB · 01</p>
          <p className="carry-stub__signal">ONE OBLIGATION REMAINS</p>
          <strong>{obligation}</strong>
          <div className="carry-stub__perforation" aria-hidden="true">
            <span>TEAR HERE</span>
          </div>
        </div>
      )}

      {phase === 'extension-ready' && (
        <button className="carry-stub__action" type="button" onClick={tearByControl}>
          TEAR CARRY FORWARD STUB
        </button>
      )}
      {phase === 'stub-separated' && (
        <button className="carry-stub__action" type="button" onClick={onStartAlignment}>
          REINSERT SAME STUB
        </button>
      )}
    </article>
  )
}
