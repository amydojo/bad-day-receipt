import {
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { CARRY_RITUAL_MOTION } from './carryForwardRitualMotion'
import {
  clampUnit,
  getActuatorMilestone,
  getActuatorResistance,
} from './carryForwardRitualThresholds'
import type {
  ActuatorMilestone,
  CarryRitualPhase,
} from './carryForwardRitualTypes'

export function MechanicalActuator({
  phase,
  progress,
  milestone,
  onMilestone,
  onRelease,
  onFallback,
  onStepFallback,
}: {
  phase: CarryRitualPhase
  progress: number
  milestone: ActuatorMilestone | null
  onMilestone: (milestone: ActuatorMilestone, progress: number) => void
  onRelease: () => void
  onFallback: () => void
  onStepFallback: () => void
}) {
  const handleRef = useRef<HTMLButtonElement | null>(null)
  const pointer = useRef<{
    id: number
    startY: number
    locked: boolean
    dragged: boolean
    lastMilestone: ActuatorMilestone | null
  } | null>(null)
  const suppressClick = useRef(false)

  const interactive = [
    'actuator-ready',
    'actuator-easy',
    'actuator-medium',
    'actuator-heavy',
    'actuator-detent',
  ].includes(phase)

  const setVisualProgress = (rawProgress: number) => {
    const node = handleRef.current
    if (!node) return
    const normalized = clampUnit(rawProgress)
    node.style.setProperty('--actuator-progress', String(normalized))
    node.style.setProperty('--actuator-resisted-progress', String(getActuatorResistance(normalized)))
  }

  const begin = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!interactive) return
    event.preventDefault()
    suppressClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = {
      id: event.pointerId,
      startY: event.clientY,
      locked: false,
      dragged: false,
      lastMilestone: milestone,
    }
  }

  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = pointer.current
    if (!active || active.id !== event.pointerId || active.locked) return
    const raw = Math.max(0, event.clientY - active.startY) / CARRY_RITUAL_MOTION.actuatorTravelPx
    const nextProgress = clampUnit(raw)
    if (nextProgress > 0.02) active.dragged = true
    setVisualProgress(nextProgress)
    const nextMilestone = getActuatorMilestone(nextProgress)
    if (nextMilestone !== active.lastMilestone || nextMilestone === 'locked') {
      active.lastMilestone = nextMilestone
      onMilestone(nextMilestone, nextProgress)
    }
    if (nextMilestone === 'locked') active.locked = true
  }

  const end = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = pointer.current
    if (!active || active.id !== event.pointerId) return
    pointer.current = null
    suppressClick.current = active.dragged
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!active.locked && active.dragged) {
      setVisualProgress(0)
      onRelease()
    }
  }

  const activateKeyboardFallback = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!interactive) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      onStepFallback()
      return
    }
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onFallback()
  }

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (interactive) onFallback()
  }

  const accessibleMilestone = milestone
    ? milestone.toUpperCase()
    : 'READY'

  return (
    <section
      className="carry-actuator"
      data-actuator-phase={phase}
      data-actuator-milestone={milestone ?? 'ready'}
      aria-labelledby="carry-actuator-heading"
    >
      <header>
        <p className="cf-eyebrow">MECHANICAL CONVERSION</p>
        <h3 id="carry-actuator-heading">Push to convert.</h3>
        <p>Resistance increases before the detent. Release early and the handle returns safely.</p>
      </header>
      <div className="carry-actuator__bay">
        <div className="carry-actuator__track" aria-hidden="true">
          <span data-mark="55">55</span>
          <span data-mark="80">80</span>
          <span data-mark="92">DETENT</span>
        </div>
        <button
          ref={handleRef}
          className="carry-actuator__handle"
          type="button"
          data-carry-actuator
          disabled={!interactive}
          aria-label="Push actuator to convert"
          aria-describedby="carry-actuator-status carry-actuator-keyboard-hint"
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onKeyDown={activateKeyboardFallback}
          onClick={handleClick}
          style={{
            '--actuator-progress': progress,
            '--actuator-resisted-progress': getActuatorResistance(progress),
          } as CSSProperties}
        >
          <span aria-hidden="true">PUSH</span>
        </button>
      </div>
      <p id="carry-actuator-keyboard-hint" className="sr-only">
        Press Enter or Space to run the complete push. Press Arrow Down to advance one force milestone at a time.
      </p>
      <p id="carry-actuator-status" className="carry-actuator__status" aria-live="polite">
        {phase === 'actuator-locked'
          ? 'Actuator locked. Conversion registered.'
          : phase === 'released-early'
            ? 'Released before detent. The actuator returned safely.'
            : `Actuator milestone: ${accessibleMilestone}.`}
      </p>
    </section>
  )
}
