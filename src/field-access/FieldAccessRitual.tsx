import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { AccessSignal } from './AccessSignal'
import { FieldObjectCard } from './FieldObjectCard'
import { MachineSlot, type MachineSlotPhase } from './MachineSlot'
import {
  triggerFieldAlignmentFeedback,
  triggerFieldCaptureFeedback,
  triggerFieldScanCompleteFeedback,
} from './fieldAccessFeedback'
import type { FieldAccessConfig } from './fieldAccessTypes'

type RitualPhase =
  | 'detected'
  | 'recognized'
  | 'presented'
  | 'captured'
  | 'reading'
  | 'accepted'
  | 'unlocked'

interface FieldAccessRitualProps {
  config: FieldAccessConfig
  token: string
  returning: boolean
  onAccepted: () => void
  onBegin: () => void
}

interface DragSnapshot {
  rawX: number
  rawY: number
  visualX: number
  visualY: number
  velocityY: number
  lastY: number
  lastAt: number
}

const COMMIT_DISTANCE = 60
const FLICK_DISTANCE = 34
const MAX_DRAG_DISTANCE = 88
const ALIGNMENT_THRESHOLD = 0.62
const CAPTURE_TRANSLATE_Y = 72
const CAPTURE_DURATION = 480

export function FieldAccessRitual({
  config,
  token,
  returning,
  onAccepted,
  onBegin,
}: FieldAccessRitualProps) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<RitualPhase>(returning ? 'recognized' : 'detected')
  const [aligned, setAligned] = useState(false)

  const pointerOriginRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef<DragSnapshot>(emptyDragSnapshot())
  const directLayerRef = useRef<HTMLDivElement | null>(null)
  const readerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingTransformRef = useRef({ x: 0, y: 0 })
  const alignedRef = useRef(false)
  const committedRef = useRef(false)
  const acceptedRef = useRef(false)
  const begunRef = useRef(false)
  const captureAnimationRef = useRef<Animation | null>(null)
  const presentButtonRef = useRef<HTMLButtonElement | null>(null)
  const beginButtonRef = useRef<HTMLButtonElement | null>(null)

  const signal = signalForPhase(phase)
  const readerPhase = readerPhaseFor(phase, aligned)
  const accessibleTitle = titleForPhase(phase)
  const statusText = useMemo(
    () => statusForPhase(phase, returning, aligned),
    [aligned, phase, returning],
  )

  useEffect(() => {
    if (phase !== 'detected') return
    const timeout = window.setTimeout(
      () => setPhase('recognized'),
      reducedMotion ? 180 : 1320,
    )
    return () => window.clearTimeout(timeout)
  }, [phase, reducedMotion])

  useEffect(() => {
    if (phase !== 'captured') return
    const timeout = window.setTimeout(
      () => setPhase('reading'),
      reducedMotion ? 80 : 300,
    )
    return () => window.clearTimeout(timeout)
  }, [phase, reducedMotion])

  useEffect(() => {
    if (phase !== 'reading') return
    const timeout = window.setTimeout(
      () => setPhase('accepted'),
      reducedMotion ? 100 : 760,
    )
    return () => window.clearTimeout(timeout)
  }, [phase, reducedMotion])

  useEffect(() => {
    if (phase !== 'accepted') return

    if (!acceptedRef.current) {
      acceptedRef.current = true
      onAccepted()
      triggerFieldScanCompleteFeedback()
    }

    sinkAcceptedCard(directLayerRef.current, reducedMotion)
    const timeout = window.setTimeout(
      () => setPhase('unlocked'),
      reducedMotion ? 140 : 720,
    )
    return () => window.clearTimeout(timeout)
  }, [onAccepted, phase, reducedMotion])

  useEffect(() => {
    if (phase !== 'recognized' && phase !== 'presented' && phase !== 'unlocked') return
    const frame = window.requestAnimationFrame(() => {
      if (phase === 'recognized') presentButtonRef.current?.focus({ preventScroll: true })
      if (phase === 'presented') directLayerRef.current?.focus({ preventScroll: true })
      if (phase === 'unlocked') beginButtonRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [phase])

  useEffect(() => () => {
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
    captureAnimationRef.current?.cancel()
  }, [])

  const presentObject = () => {
    committedRef.current = false
    alignedRef.current = false
    setAligned(false)
    setReaderProximity(readerRef.current, 0)
    clearDirectLayer(directLayerRef.current)
    dragRef.current = emptyDragSnapshot()
    setPhase('presented')
  }

  const commitInsertion = () => {
    if (phase !== 'presented' || committedRef.current) return
    committedRef.current = true
    alignedRef.current = true
    setAligned(true)
    setReaderProximity(readerRef.current, 1)
    triggerFieldCaptureFeedback()
    setPhase('captured')

    const node = directLayerRef.current
    if (!node) return

    captureAnimationRef.current?.cancel()
    const startTransform = node.style.transform || 'translate3d(0px, 0px, 0px) rotate(0deg)'
    const finalTransform = `translate3d(0px, ${CAPTURE_TRANSLATE_Y}px, 0px) scale(.992)`

    if (reducedMotion) {
      node.style.transform = finalTransform
      return
    }

    const animation = node.animate(
      [
        { transform: startTransform },
        { transform: finalTransform, offset: 1 },
      ],
      {
        duration: CAPTURE_DURATION,
        easing: 'cubic-bezier(.18, .82, .22, 1)',
        fill: 'forwards',
      },
    )
    captureAnimationRef.current = animation
    animation.addEventListener('finish', () => {
      node.style.transform = finalTransform
      animation.cancel()
      captureAnimationRef.current = null
    }, { once: true })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'presented') return
    pointerOriginRef.current = { x: event.clientX, y: event.clientY }
    dragRef.current = {
      ...emptyDragSnapshot(),
      lastY: event.clientY,
      lastAt: event.timeStamp,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'presented' || !event.currentTarget.hasPointerCapture(event.pointerId)) return

    const rawY = clamp(event.clientY - pointerOriginRef.current.y, 0, MAX_DRAG_DISTANCE)
    const rawX = clamp(event.clientX - pointerOriginRef.current.x, -26, 26)
    const progress = clamp(rawY / COMMIT_DISTANCE, 0, 1)
    const magneticPull = clamp((progress - 0.42) / 0.58, 0, 1)
    const visualX = rawX * (1 - magneticPull * 0.94)
    const visualY = directDistance(rawY)
    const elapsed = Math.max(1, event.timeStamp - dragRef.current.lastAt)
    const velocityY = (event.clientY - dragRef.current.lastY) / elapsed

    dragRef.current = {
      rawX,
      rawY,
      visualX,
      visualY,
      velocityY,
      lastY: event.clientY,
      lastAt: event.timeStamp,
    }

    scheduleDirectTransform(visualX, visualY)
    setReaderProximity(readerRef.current, progress)

    const nextAligned = progress >= ALIGNMENT_THRESHOLD
    if (nextAligned && !alignedRef.current) {
      alignedRef.current = true
      setAligned(true)
      triggerFieldAlignmentFeedback()
    } else if (!nextAligned && alignedRef.current && progress < ALIGNMENT_THRESHOLD - 0.16) {
      alignedRef.current = false
      setAligned(false)
    }
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'presented') return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const drag = dragRef.current
    const committed = drag.rawY >= COMMIT_DISTANCE
      || (drag.rawY >= FLICK_DISTANCE && drag.velocityY >= 0.48)

    if (committed) {
      commitInsertion()
      return
    }

    alignedRef.current = false
    setAligned(false)
    setReaderProximity(readerRef.current, 0)
    returnCardToRest(directLayerRef.current, reducedMotion)
    dragRef.current = emptyDragSnapshot()
  }

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    commitInsertion()
  }

  const beginOperation = () => {
    if (begunRef.current) return
    begunRef.current = true
    onBegin()
  }

  const scheduleDirectTransform = (x: number, y: number) => {
    pendingTransformRef.current = { x, y }
    if (rafRef.current !== null) return

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      const node = directLayerRef.current
      if (!node) return
      const pending = pendingTransformRef.current
      node.style.transform = `translate3d(${pending.x}px, ${pending.y}px, 0px) rotate(${pending.x * 0.012}deg)`
    })
  }

  return (
    <main
      className="field-access-terminal"
      data-state={phase}
      data-returning={returning ? 'true' : 'false'}
      aria-labelledby="field-access-title"
    >
      <div className="field-access-terminal__shell">
        <header className="field-access-terminal__header">
          <span>LD–FIELD TERMINAL / {config.edition}</span>
          <AccessSignal active={signal} />
        </header>

        <div className="field-access-terminal__content">
          {phase === 'detected' ? (
            <section className="field-access-screen field-access-screen--detected field-access-detection">
              <p className="field-access-kicker">EXTERNAL INPUT</p>
              <h1 id="field-access-title">OBJECT<br />DETECTED</h1>
              <p>A field object has entered range.<br />Hold steady while the terminal reads it.</p>
              <div className="field-access-scan" aria-hidden="true"><i /><i /><i /><i /></div>
              <span className="field-access-machine-copy">READING EXTERNAL OBJECT…</span>
              <div className="field-access-ghost-object" aria-hidden="true">UNRESOLVED OBJECT</div>
            </section>
          ) : (
            <section className="field-access-one-shot" data-phase={phase} data-aligned={aligned ? 'true' : 'false'}>
              <div className="field-access-one-shot__hero">
                <p className="field-access-kicker field-access-one-shot__kicker" aria-hidden="true">
                  <span data-copy="recognized">AUTHENTICITY / VALID</span>
                  <span data-copy="accepted">FIELD OBJECT / ACCEPTED</span>
                  <span data-copy="unlocked">MACHINE ASSIGNMENT / COMPLETE</span>
                </p>
                <h1 id="field-access-title" className="field-access-one-shot__title">
                  <span data-copy="recognized" aria-hidden="true">OBJECT<br />RECOGNIZED</span>
                  <span data-copy="accepted" aria-hidden="true">OBJECT<br />ACCEPTED</span>
                  <span data-copy="unlocked" aria-hidden="true">BAD DAY<br />RECEIPT</span>
                  <span className="field-access-sr-only">{accessibleTitle}</span>
                </h1>
                <p className="field-access-one-shot__lead">
                  {returning ? 'The terminal remembers this object.' : 'Compare the object in your hand.'}<br />
                  Continue when ready.
                </p>
              </div>

              <div className="field-access-one-shot__metadata" aria-label="Field object details">
                <span>LD–{config.edition}</span>
                <span>{config.objectName.toUpperCase()}</span>
                <span>SERIAL / {token}</span>
              </div>

              <div className="field-access-one-shot__stage">
                <div className="field-access-card-trajectory">
                  <div
                    ref={directLayerRef}
                    className="field-access-card-direct"
                    data-continuous-object="true"
                    role="button"
                    tabIndex={phase === 'presented' ? 0 : -1}
                    aria-label={`Guide field object ${config.edition} into the reader`}
                    aria-describedby="field-access-gesture-help"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                    onKeyDown={handleCardKeyDown}
                  >
                    <FieldObjectCard edition={config.edition} token={token} compact />
                  </div>
                </div>

                <MachineSlot ref={readerRef} phase={readerPhase}>
                  <div className="field-access-machine-reveal">
                    <span>{config.machineLabel} / SOFT MACHINE</span>
                    <strong>BAD DAY<br />RECEIPT</strong>
                    <p>Documents difficult days<br />before they leak everywhere.</p>
                    <small>UNLOCKED BY LD–{config.edition} / {token}</small>
                    <button
                      ref={beginButtonRef}
                      type="button"
                      className="field-access-button field-access-button--primary"
                      onClick={beginOperation}
                    >
                      BEGIN OPERATION
                    </button>
                  </div>
                </MachineSlot>

                <p id="field-access-gesture-help" className="field-access-one-shot__gesture">
                  {phase === 'presented' ? 'Guide the object to the reader.' : statusText}
                </p>
              </div>

              {phase === 'recognized' && (
                <button
                  ref={presentButtonRef}
                  type="button"
                  className="field-access-button field-access-button--secondary field-access-button--present"
                  onClick={presentObject}
                >
                  PRESENT OBJECT
                </button>
              )}

              {phase === 'presented' && (
                <button
                  type="button"
                  className="field-access-one-shot__fallback"
                  onClick={commitInsertion}
                >
                  INSERT ARTIFACT
                </button>
              )}
            </section>
          )}
        </div>

        <footer className="field-access-terminal__footer">
          <span>{config.edition}</span>
          <span>/access/{config.edition}/{token}</span>
        </footer>
        <p className="field-access-live" aria-live="polite">{statusText}</p>
      </div>
    </main>
  )
}

function readerPhaseFor(phase: RitualPhase, aligned: boolean): MachineSlotPhase {
  if (phase === 'captured' || phase === 'reading' || phase === 'accepted' || phase === 'unlocked') {
    return phase
  }
  return aligned ? 'aligned' : 'idle'
}

function signalForPhase(phase: RitualPhase): 0 | 1 | 2 | 3 {
  if (phase === 'detected') return 0
  if (phase === 'recognized' || phase === 'presented') return 1
  if (phase === 'captured' || phase === 'reading') return 2
  return 3
}

function titleForPhase(phase: RitualPhase): string {
  if (phase === 'accepted') return 'Object accepted'
  if (phase === 'unlocked') return 'Bad Day Receipt'
  if (phase === 'detected') return 'Object detected'
  return 'Object recognized'
}

function statusForPhase(phase: RitualPhase, returning: boolean, aligned: boolean): string {
  switch (phase) {
    case 'detected': return 'External field object detected.'
    case 'recognized': return returning ? 'Known field object recognized. Present it when ready.' : 'Field object authenticity verified. Present it when ready.'
    case 'presented': return aligned ? 'Field object aligned with the reader.' : 'Guide the field object into the reader.'
    case 'captured': return 'The reader has taken control of the field object.'
    case 'reading': return 'Validating the QR code printed on the field object.'
    case 'accepted': return 'Field object QR verified.'
    case 'unlocked': return 'Bad Day Receipt unlocked. Begin operation when ready.'
  }
}

function directDistance(rawDistance: number): number {
  if (rawDistance <= COMMIT_DISTANCE) return rawDistance
  return COMMIT_DISTANCE + (rawDistance - COMMIT_DISTANCE) * 0.35
}

function emptyDragSnapshot(): DragSnapshot {
  return {
    rawX: 0,
    rawY: 0,
    visualX: 0,
    visualY: 0,
    velocityY: 0,
    lastY: 0,
    lastAt: 0,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function setReaderProximity(node: HTMLDivElement | null, value: number): void {
  node?.style.setProperty('--field-reader-proximity', String(clamp(value, 0, 1)))
}

function clearDirectLayer(node: HTMLDivElement | null): void {
  if (!node) return
  node.getAnimations().forEach((animation) => animation.cancel())
  node.style.removeProperty('transform')
  node.style.removeProperty('opacity')
}

function returnCardToRest(node: HTMLDivElement | null, reducedMotion: boolean): void {
  if (!node) return
  const currentTransform = node.style.transform || 'translate3d(0px, 0px, 0px)'
  if (reducedMotion) {
    node.style.removeProperty('transform')
    return
  }

  const animation = node.animate(
    [
      { transform: currentTransform },
      { transform: 'translate3d(0px, 0px, 0px) rotate(0deg)' },
    ],
    {
      duration: 360,
      easing: 'cubic-bezier(.22, .8, .2, 1)',
      fill: 'forwards',
    },
  )
  animation.addEventListener('finish', () => {
    node.style.removeProperty('transform')
    animation.cancel()
  }, { once: true })
}

function sinkAcceptedCard(node: HTMLDivElement | null, reducedMotion: boolean): void {
  if (!node) return
  const finalTransform = `translate3d(0px, ${CAPTURE_TRANSLATE_Y + 62}px, 0px) scale(.982)`
  if (reducedMotion) {
    node.style.transform = finalTransform
    node.style.opacity = '0'
    return
  }

  const currentTransform = getComputedStyle(node).transform === 'none'
    ? `translate3d(0px, ${CAPTURE_TRANSLATE_Y}px, 0px) scale(.992)`
    : getComputedStyle(node).transform
  const animation = node.animate(
    [
      { transform: currentTransform, opacity: 1 },
      { transform: finalTransform, opacity: 0 },
    ],
    {
      duration: 620,
      easing: 'cubic-bezier(.22, .8, .2, 1)',
      fill: 'forwards',
    },
  )
  animation.addEventListener('finish', () => {
    node.style.transform = finalTransform
    node.style.opacity = '0'
    animation.cancel()
  }, { once: true })
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => (
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ))

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reduced
}
