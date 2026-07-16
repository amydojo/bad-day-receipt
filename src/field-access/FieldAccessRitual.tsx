import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { AccessSignal } from './AccessSignal'
import { FieldObjectCard } from './FieldObjectCard'
import { MachineSlot } from './MachineSlot'
import { triggerFieldInsertionFeedback } from './fieldAccessFeedback'
import type { FieldAccessConfig } from './fieldAccessTypes'

type RitualState =
  | 'detected'
  | 'recognized'
  | 'insert'
  | 'entering'
  | 'verifying'
  | 'granted'
  | 'unlocked'
  | 'ready'

interface FieldAccessRitualProps {
  config: FieldAccessConfig
  token: string
  returning: boolean
  onAccepted: () => void
  onBegin: () => void
}

const DRAG_COMMIT_DISTANCE = 76
const DRAG_LIMIT = 124

export function FieldAccessRitual({
  config,
  token,
  returning,
  onAccepted,
  onBegin,
}: FieldAccessRitualProps) {
  const reducedMotion = useReducedMotion()
  const [state, setState] = useState<RitualState>(returning ? 'recognized' : 'detected')
  const [dragY, setDragY] = useState(0)
  const dragRef = useRef(0)
  const pointerOrigin = useRef(0)
  const committedRef = useRef(false)
  const acceptedRef = useRef(false)
  const begunRef = useRef(false)
  const insertButtonRef = useRef<HTMLButtonElement | null>(null)
  const beginButtonRef = useRef<HTMLButtonElement | null>(null)

  const signal = signalForState(state)
  const statusText = useMemo(() => statusForState(state, returning), [returning, state])

  useEffect(() => {
    const transition = automaticTransition(state, reducedMotion)
    if (!transition) return
    const timeout = window.setTimeout(() => setState(transition.next), transition.delay)
    return () => window.clearTimeout(timeout)
  }, [reducedMotion, state])

  useEffect(() => {
    if (state !== 'granted' || acceptedRef.current) return
    acceptedRef.current = true
    onAccepted()
  }, [onAccepted, state])

  useEffect(() => {
    if (state !== 'ready' || begunRef.current) return
    begunRef.current = true
    const timeout = window.setTimeout(onBegin, reducedMotion ? 120 : 520)
    return () => window.clearTimeout(timeout)
  }, [onBegin, reducedMotion, state])

  useEffect(() => {
    if (state !== 'insert' && state !== 'unlocked') return
    const frame = window.requestAnimationFrame(() => {
      if (state === 'insert') insertButtonRef.current?.focus({ preventScroll: true })
      if (state === 'unlocked') beginButtonRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [state])

  const commitInsertion = () => {
    if (state !== 'insert' || committedRef.current) return
    committedRef.current = true
    setDragY(DRAG_LIMIT)
    dragRef.current = DRAG_LIMIT
    triggerFieldInsertionFeedback()
    setState('entering')
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (state !== 'insert') return
    pointerOrigin.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (state !== 'insert' || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const next = Math.max(0, Math.min(DRAG_LIMIT, event.clientY - pointerOrigin.current))
    dragRef.current = next
    setDragY(next)
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (state !== 'insert') return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (dragRef.current >= DRAG_COMMIT_DISTANCE) {
      commitInsertion()
      return
    }
    dragRef.current = 0
    setDragY(0)
  }

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    commitInsertion()
  }

  return (
    <main
      className="field-access-terminal"
      data-state={state}
      data-returning={returning ? 'true' : 'false'}
      aria-labelledby="field-access-title"
    >
      <div className="field-access-terminal__shell">
        <header className="field-access-terminal__header">
          <span>LD–FIELD TERMINAL / {config.edition}</span>
          <AccessSignal active={signal} />
        </header>

        <div className="field-access-terminal__content">
          {state === 'detected' && (
            <section className="field-access-screen field-access-screen--detected">
              <p className="field-access-kicker">EXTERNAL INPUT</p>
              <h1 id="field-access-title">OBJECT<br />DETECTED</h1>
              <p>A field object has entered range.<br />Hold steady while the terminal reads it.</p>
              <div className="field-access-scan" aria-hidden="true">
                <i /><i /><i /><i />
              </div>
              <span className="field-access-machine-copy">READING EXTERNAL OBJECT…</span>
              <div className="field-access-ghost-object" aria-hidden="true">UNRESOLVED OBJECT</div>
            </section>
          )}

          {state === 'recognized' && (
            <section className="field-access-screen field-access-screen--recognized">
              <p className="field-access-kicker">AUTHENTICITY / VALID</p>
              <h1 id="field-access-title">OBJECT<br />RECOGNIZED</h1>
              <FieldObjectCard edition={config.edition} token={token} compact />
              <dl className="field-access-metadata">
                <div><dt>FIELD OBJECT</dt><dd>LD–{config.edition}</dd></div>
                <div><dt>CLASS</dt><dd>{config.objectName.toUpperCase()}</dd></div>
                <div><dt>SERIAL</dt><dd>{token}</dd></div>
                <div><dt>ACCESS</dt><dd>{returning ? 'RECOGNIZED' : 'UNRESOLVED'}</dd></div>
              </dl>
              <p className="field-access-caption">
                {returning ? 'The terminal remembers this object.' : 'This is the object you found.'}
              </p>
            </section>
          )}

          {state === 'insert' && (
            <section className="field-access-screen field-access-screen--insert">
              <p className="field-access-kicker">FIELD ACCESS REQUIRED</p>
              <h1 id="field-access-title">INSERT THE<br />FOUND OBJECT</h1>
              <p>Swipe the artifact into the slot<br />to operate the machine.</p>
              <div
                className="field-access-draggable"
                role="button"
                tabIndex={0}
                aria-label={`Insert field object ${config.edition}`}
                aria-describedby="field-access-insert-help"
                style={{ '--field-card-drag': `${dragY}px` } as CSSProperties}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onKeyDown={handleCardKeyDown}
              >
                <FieldObjectCard edition={config.edition} token={token} compact />
              </div>
              <span id="field-access-insert-help" className="field-access-swipe-label">SWIPE DOWN</span>
              <MachineSlot progress={dragY / DRAG_LIMIT} />
              <button
                ref={insertButtonRef}
                type="button"
                className="field-access-button field-access-button--secondary"
                onClick={commitInsertion}
              >
                INSERT ARTIFACT
              </button>
            </section>
          )}

          {state === 'entering' && (
            <section className="field-access-screen field-access-screen--entering">
              <p className="field-access-kicker">OBJECT IN MOTION</p>
              <h1 id="field-access-title">ARTIFACT<br />ENTERING</h1>
              <p className="field-access-machine-copy">POSITION / 68%<br />GRIP / CONFIRMED</p>
              <div className="field-access-entering-object" aria-hidden="true">
                <FieldObjectCard edition={config.edition} token={token} compact entering />
              </div>
              <MachineSlot engaged progress={1} />
              <div className="field-access-dark-well">
                <span>DO NOT REMOVE OBJECT</span>
                <p>MECHANICAL COUPLING…</p>
              </div>
            </section>
          )}

          {state === 'verifying' && (
            <section className="field-access-screen field-access-screen--verifying">
              <p className="field-access-kicker">FIELD OBJECT / ACCEPTED</p>
              <h1 id="field-access-title">VERIFYING<br />ACCESS</h1>
              <div className="field-access-checklist" role="status">
                <div><span>READING OBJECT HISTORY</span><strong>COMPLETE</strong></div>
                <div><span>VERIFYING FIELD ACCESS</span><strong>COMPLETE</strong></div>
                <div><span>CALIBRATING MACHINE</span><strong>ACTIVE</strong></div>
              </div>
              <span className="field-access-muted-note">PLEASE KEEP THIS WINDOW OPEN</span>
            </section>
          )}

          {state === 'granted' && (
            <section className="field-access-screen field-access-screen--granted">
              <p className="field-access-kicker">AUTHORIZATION / FIELD OBJECT</p>
              <h1 id="field-access-title">ACCESS<br />GRANTED</h1>
              <div className="field-access-grant-card" role="status">
                <span aria-hidden="true">✓</span>
                <strong>FIELD OBJECT {config.edition}<br />HAS BEEN ACCEPTED</strong>
                <small>SERIAL / {token}<br />ACCESS CLASS / SOFT MACHINE</small>
              </div>
              <span className="field-access-machine-copy">UNLOCKING ASSIGNED MACHINE…</span>
            </section>
          )}

          {state === 'unlocked' && (
            <section className="field-access-screen field-access-screen--unlocked">
              <p className="field-access-kicker">MACHINE ASSIGNMENT / COMPLETE</p>
              <h1 id="field-access-title">BAD DAY<br />RECEIPT</h1>
              <span className="field-access-machine-copy">{config.machineLabel} / SOFT MACHINE</span>
              <hr />
              <p>Documents difficult days<br />before they leak everywhere.</p>
              <div className="field-access-machine-state">
                <span>MACHINE STATE</span>
                <strong>READY</strong>
                <i aria-hidden="true" />
                <small>UNLOCKED BY LD–{config.edition} / {token}</small>
              </div>
              <button
                ref={beginButtonRef}
                type="button"
                className="field-access-button field-access-button--primary"
                onClick={() => setState('ready')}
              >
                BEGIN OPERATION
              </button>
            </section>
          )}

          {state === 'ready' && (
            <section className="field-access-screen field-access-screen--ready">
              <p className="field-access-kicker">SM–001 / OPERATION READY</p>
              <h1 id="field-access-title">DOCUMENT<br />THE DAY</h1>
              <p>Before attempting to understand it.</p>
              <div className="field-access-receipt-preview" aria-hidden="true">
                <span>BAD DAY RECEIPT / SM–001</span>
                <div>
                  <strong>BAD DAY<br />RECEIPT</strong>
                  <p>EMOTIONAL OVERHEAD ··· OPEN<br />UNFINISHED THOUGHTS ··· 14<br />THINGS SURVIVED ········ 6</p>
                  <small>FIELD ACCESS / LD–{config.edition}</small>
                </div>
              </div>
              <span className="field-access-machine-copy">MACHINE ONLINE…</span>
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

function automaticTransition(
  state: RitualState,
  reducedMotion: boolean,
): { next: RitualState; delay: number } | null {
  const short = reducedMotion ? 140 : 760
  switch (state) {
    case 'detected': return { next: 'recognized', delay: short }
    case 'recognized': return { next: 'insert', delay: reducedMotion ? 180 : 920 }
    case 'entering': return { next: 'verifying', delay: reducedMotion ? 160 : 560 }
    case 'verifying': return { next: 'granted', delay: reducedMotion ? 260 : 1380 }
    case 'granted': return { next: 'unlocked', delay: reducedMotion ? 180 : 720 }
    default: return null
  }
}

function signalForState(state: RitualState): 0 | 1 | 2 | 3 {
  if (state === 'detected') return 0
  if (state === 'recognized' || state === 'insert') return 1
  if (state === 'entering' || state === 'verifying') return 2
  return 3
}

function statusForState(state: RitualState, returning: boolean): string {
  switch (state) {
    case 'detected': return 'External field object detected.'
    case 'recognized': return returning ? 'Known field object recognized.' : 'Field object authenticity verified.'
    case 'insert': return 'Insert the field object by swiping down or activating the Insert Artifact button.'
    case 'entering': return 'Field object entering machine.'
    case 'verifying': return 'Field access is being verified.'
    case 'granted': return 'Access granted.'
    case 'unlocked': return 'Bad Day Receipt unlocked. Begin operation when ready.'
    case 'ready': return 'Bad Day Receipt machine online.'
  }
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
