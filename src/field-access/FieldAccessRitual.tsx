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
import {
  triggerFieldAlignmentFeedback,
  triggerFieldCaptureFeedback,
  triggerFieldScanCompleteFeedback,
} from './fieldAccessFeedback'
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

type ScannerPhase = 'idle' | 'aligned' | 'captured' | 'reading' | 'accepted'

interface FieldAccessRitualProps {
  config: FieldAccessConfig
  token: string
  returning: boolean
  onAccepted: () => void
  onBegin: () => void
}

const RAW_COMMIT_DISTANCE = 112
const RAW_DRAG_LIMIT = 168
const VISUAL_DRAG_LIMIT = 124
const ALIGNMENT_THRESHOLD = 0.58

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
  const [dragX, setDragX] = useState(0)
  const [aligned, setAligned] = useState(false)
  const [scannerPhase, setScannerPhase] = useState<ScannerPhase>('idle')
  const rawDragRef = useRef(0)
  const pointerOrigin = useRef({ x: 0, y: 0 })
  const alignedRef = useRef(false)
  const committedRef = useRef(false)
  const acceptedRef = useRef(false)
  const begunRef = useRef(false)
  const presentButtonRef = useRef<HTMLButtonElement | null>(null)
  const insertButtonRef = useRef<HTMLButtonElement | null>(null)
  const beginButtonRef = useRef<HTMLButtonElement | null>(null)

  const signal = signalForState(state)
  const statusText = useMemo(() => statusForState(state, returning, scannerPhase), [returning, scannerPhase, state])

  useEffect(() => {
    const transition = automaticTransition(state, reducedMotion)
    if (!transition) return
    const timeout = window.setTimeout(() => setState(transition.next), transition.delay)
    return () => window.clearTimeout(timeout)
  }, [reducedMotion, state])

  useEffect(() => {
    if (state !== 'entering') return
    setScannerPhase('captured')

    if (reducedMotion) {
      setScannerPhase('accepted')
      triggerFieldScanCompleteFeedback()
      return
    }

    const readingTimer = window.setTimeout(() => setScannerPhase('reading'), 430)
    const acceptedTimer = window.setTimeout(() => {
      setScannerPhase('accepted')
      triggerFieldScanCompleteFeedback()
    }, 1450)

    return () => {
      window.clearTimeout(readingTimer)
      window.clearTimeout(acceptedTimer)
    }
  }, [reducedMotion, state])

  useEffect(() => {
    if (state !== 'granted' || acceptedRef.current) return
    acceptedRef.current = true
    onAccepted()
  }, [onAccepted, state])

  useEffect(() => {
    if (state !== 'ready' || begunRef.current) return
    begunRef.current = true
    const timeout = window.setTimeout(onBegin, reducedMotion ? 180 : 980)
    return () => window.clearTimeout(timeout)
  }, [onBegin, reducedMotion, state])

  useEffect(() => {
    if (state !== 'recognized' && state !== 'insert' && state !== 'unlocked') return
    const frame = window.requestAnimationFrame(() => {
      if (state === 'recognized') presentButtonRef.current?.focus({ preventScroll: true })
      if (state === 'insert') insertButtonRef.current?.focus({ preventScroll: true })
      if (state === 'unlocked') beginButtonRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [state])

  const enterInsertState = () => {
    committedRef.current = false
    rawDragRef.current = 0
    alignedRef.current = false
    setDragX(0)
    setDragY(0)
    setAligned(false)
    setScannerPhase('idle')
    setState('insert')
  }

  const commitInsertion = () => {
    if (state !== 'insert' || committedRef.current) return
    committedRef.current = true
    rawDragRef.current = RAW_COMMIT_DISTANCE
    setDragX(0)
    setDragY(VISUAL_DRAG_LIMIT)
    setAligned(true)
    setScannerPhase('captured')
    triggerFieldCaptureFeedback()
    setState('entering')
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (state !== 'insert') return
    pointerOrigin.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (state !== 'insert' || !event.currentTarget.hasPointerCapture(event.pointerId)) return

    const rawY = Math.max(0, Math.min(RAW_DRAG_LIMIT, event.clientY - pointerOrigin.current.y))
    const progress = Math.min(1, rawY / RAW_COMMIT_DISTANCE)
    const rawX = Math.max(-30, Math.min(30, event.clientX - pointerOrigin.current.x))
    const magneticPull = Math.max(0, Math.min(1, (progress - 0.3) / 0.7))
    const nextX = rawX * (1 - magneticPull)
    const nextY = resistedDistance(rawY)
    const nextAligned = progress >= ALIGNMENT_THRESHOLD

    rawDragRef.current = rawY
    setDragX(nextX)
    setDragY(nextY)

    if (nextAligned && !alignedRef.current) {
      alignedRef.current = true
      setAligned(true)
      setScannerPhase('aligned')
      triggerFieldAlignmentFeedback()
    } else if (!nextAligned && alignedRef.current && progress < ALIGNMENT_THRESHOLD - 0.12) {
      alignedRef.current = false
      setAligned(false)
      setScannerPhase('idle')
    }
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (state !== 'insert') return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (rawDragRef.current >= RAW_COMMIT_DISTANCE) {
      commitInsertion()
      return
    }

    rawDragRef.current = 0
    alignedRef.current = false
    setDragX(0)
    setDragY(0)
    setAligned(false)
    setScannerPhase('idle')
  }

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    commitInsertion()
  }

  const insertProgress = Math.min(1, rawDragRef.current / RAW_COMMIT_DISTANCE)

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
                <div><dt>ACCESS</dt><dd>{returning ? 'RECOGNIZED' : 'VALID'}</dd></div>
              </dl>
              <p className="field-access-caption">
                {returning ? 'The terminal remembers this object.' : 'Compare the object in your hand. Continue when ready.'}
              </p>
              <button
                ref={presentButtonRef}
                type="button"
                className="field-access-button field-access-button--secondary field-access-button--present"
                onClick={enterInsertState}
              >
                PRESENT OBJECT
              </button>
            </section>
          )}

          {state === 'insert' && (
            <section className="field-access-screen field-access-screen--insert">
              <p className="field-access-kicker">FIELD ACCESS REQUIRED</p>
              <h1 id="field-access-title">INSERT THE<br />FOUND OBJECT</h1>
              <p>Guide the artifact into the reader.<br />The machine will take it from you.</p>
              <div
                className="field-access-draggable"
                data-aligned={aligned ? 'true' : 'false'}
                role="button"
                tabIndex={0}
                aria-label={`Insert field object ${config.edition}`}
                aria-describedby="field-access-insert-help"
                style={{
                  '--field-card-drag-x': `${dragX}px`,
                  '--field-card-drag-y': `${dragY}px`,
                  '--field-card-progress': insertProgress,
                } as CSSProperties}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onKeyDown={handleCardKeyDown}
              >
                <FieldObjectCard edition={config.edition} token={token} compact />
              </div>
              <span id="field-access-insert-help" className="field-access-swipe-label">
                {aligned ? 'ALIGNMENT FOUND' : 'SWIPE DOWN'}
              </span>
              <MachineSlot aligned={aligned} progress={insertProgress} phase={aligned ? 'aligned' : 'idle'} />
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
            <section className="field-access-screen field-access-screen--entering" data-scanner-phase={scannerPhase}>
              <p className="field-access-kicker">MECHANICAL CAPTURE</p>
              <h1 id="field-access-title">OBJECT<br />UNDER READ</h1>
              <p className="field-access-machine-copy">
                {scannerPhase === 'captured' && <>CONTACT / CONFIRMED<br />ROLLER DRIVE / ACTIVE</>}
                {scannerPhase === 'reading' && <>READING PRINTED FIELD<br />MATCHING SERIAL / {token}</>}
                {scannerPhase === 'accepted' && <>OBJECT / ACCEPTED<br />RELEASING MACHINE ACCESS</>}
              </p>
              <div className="field-access-entering-object" aria-hidden="true">
                <FieldObjectCard edition={config.edition} token={token} compact entering />
              </div>
              <MachineSlot engaged progress={1} phase={scannerPhase} />
              <div className="field-access-dark-well">
                <span>{scannerPhase === 'accepted' ? 'READ COMPLETE' : 'DO NOT REMOVE OBJECT'}</span>
                <p>{scannerPhase === 'reading' ? 'OPTICAL FIELD PASS…' : scannerPhase === 'accepted' ? 'FIELD OBJECT RETAINED' : 'MECHANICAL COUPLING…'}</p>
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
  switch (state) {
    case 'detected': return { next: 'recognized', delay: reducedMotion ? 220 : 1500 }
    case 'entering': return { next: 'verifying', delay: reducedMotion ? 320 : 2100 }
    case 'verifying': return { next: 'granted', delay: reducedMotion ? 480 : 2100 }
    case 'granted': return { next: 'unlocked', delay: reducedMotion ? 420 : 1400 }
    default: return null
  }
}

function signalForState(state: RitualState): 0 | 1 | 2 | 3 {
  if (state === 'detected') return 0
  if (state === 'recognized' || state === 'insert') return 1
  if (state === 'entering' || state === 'verifying') return 2
  return 3
}

function statusForState(state: RitualState, returning: boolean, scannerPhase: ScannerPhase): string {
  switch (state) {
    case 'detected': return 'External field object detected.'
    case 'recognized': return returning ? 'Known field object recognized. Present it when ready.' : 'Field object authenticity verified. Present it when ready.'
    case 'insert': return 'Guide the field object into the reader by swiping down or activating Insert Artifact.'
    case 'entering': return scannerPhase === 'accepted' ? 'Field object accepted.' : scannerPhase === 'reading' ? 'Field object serial is being read.' : 'The machine has captured the field object.'
    case 'verifying': return 'Field access is being verified.'
    case 'granted': return 'Access granted.'
    case 'unlocked': return 'Bad Day Receipt unlocked. Begin operation when ready.'
    case 'ready': return 'Bad Day Receipt machine online.'
  }
}

function resistedDistance(rawDistance: number): number {
  if (rawDistance <= 48) return rawDistance
  if (rawDistance <= RAW_COMMIT_DISTANCE) return 48 + (rawDistance - 48) * 0.72
  return Math.min(VISUAL_DRAG_LIMIT, 94.08 + (rawDistance - RAW_COMMIT_DISTANCE) * 0.42)
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
