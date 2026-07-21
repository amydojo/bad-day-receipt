import {
  useEffect,
  useReducer,
  useRef,
} from 'react'
import type { MachineSensoryDirector } from '../../mobile-instrument/sensory/sensoryTypes'
import { CarryForwardStub } from './CarryForwardStub'
import { FieldTransferArtifact } from './FieldTransferArtifact'
import { MechanicalActuator } from './MechanicalActuator'
import {
  createCarryRitualCheckpoint,
  getCarryRitualPhaseAdvance,
  getFallbackActuatorSequence,
  type CarryRitualCheckpoint,
} from './carryForwardRitualEffects'
import {
  carryForwardRitualReducer,
  createInitialCarryRitualState,
  toCarryRitualHandoff,
} from './carryForwardRitualReducer'
import { emitCarryRitualMilestone } from './carryForwardRitualSensory'
import type {
  ActuatorMilestone,
  CarryRitualHandoff,
  CarryRitualPayload,
  CarryRitualPhase,
  CarryRitualState,
} from './carryForwardRitualTypes'
import './carry-forward-ritual.css'

const BUSY_PHASES = new Set<CarryRitualPhase>([
  'extension-printing',
  'stub-aligning',
  'stub-intake',
  'actuator-revealing',
  'actuator-locked',
  'transform-registering',
  'transfer-issuing',
])

export function CarryForwardRitual({
  payload,
  reducedMotion,
  sensory,
  onApply,
  onAdjust,
  onCancel,
  onCheckpoint,
}: {
  payload: CarryRitualPayload
  reducedMotion: boolean
  sensory?: MachineSensoryDirector
  onApply?: (handoff: CarryRitualHandoff) => void
  onAdjust: () => void
  onCancel: () => void
  onCheckpoint?: (checkpoint: CarryRitualCheckpoint) => void
}) {
  const [state, dispatch] = useReducer(
    carryForwardRitualReducer,
    payload,
    createInitialCarryRitualState,
  )
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const emittedMilestones = useRef(new Set<CarryRitualPhase>())
  const fallbackTimers = useRef<number[]>([])

  useEffect(() => {
    const advance = getCarryRitualPhaseAdvance(state.phase, reducedMotion)
    if (!advance) return
    const timeout = window.setTimeout(() => dispatch(advance.event), advance.delay)
    return () => window.clearTimeout(timeout)
  }, [reducedMotion, state.phase])

  useEffect(() => {
    emitCarryRitualMilestone({
      sensory,
      phase: state.phase,
      emitted: emittedMilestones.current,
    })
  }, [sensory, state.phase])

  useEffect(() => {
    const checkpoint = createCarryRitualCheckpoint(state)
    if (checkpoint) onCheckpoint?.(checkpoint)
  }, [onCheckpoint, state])

  useEffect(() => {
    if (BUSY_PHASES.has(state.phase)) return
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [state.phase])

  useEffect(() => () => {
    for (const timer of fallbackTimers.current) window.clearTimeout(timer)
    fallbackTimers.current = []
  }, [])

  const runActuatorFallback = () => {
    if (!state.phase.startsWith('actuator-') || state.phase === 'actuator-locked') return
    for (const timer of fallbackTimers.current) window.clearTimeout(timer)
    fallbackTimers.current = getFallbackActuatorSequence().map(({ delay, event }) => (
      window.setTimeout(() => dispatch(event), reducedMotion ? Math.min(delay, 40) : delay)
    ))
  }

  const handoff: CarryRitualHandoff = {
    obligation: state.payload.obligation,
    sourceText: state.payload.sourceText,
    budget: state.payload.budget,
    origin: state.payload.origin,
    receiptId: state.payload.receiptId,
    stubId: state.stubId,
  }

  const transferVisible = state.phase === 'transform-registering'
    || state.phase === 'transfer-issuing'
    || state.phase === 'transfer-issued'

  const showActuator = state.phase === 'actuator-ready'
    || state.phase === 'actuator-easy'
    || state.phase === 'actuator-medium'
    || state.phase === 'actuator-heavy'
    || state.phase === 'actuator-detent'
    || state.phase === 'actuator-locked'
    || state.phase === 'released-early'

  return (
    <section
      className="carry-ritual"
      data-carry-ritual
      data-carry-ritual-phase={state.phase}
      data-reduced-motion={reducedMotion || undefined}
      aria-labelledby="carry-ritual-heading"
      aria-busy={BUSY_PHASES.has(state.phase)}
    >
      <header className="carry-ritual__header">
        <p className="cf-eyebrow">CARRY FORWARD · SAME MATERIAL</p>
        <h2 id="carry-ritual-heading" ref={headingRef} tabIndex={-1}>
          {getPhaseHeading(state.phase)}
        </h2>
        <p>{getPhaseDescription(state.phase)}</p>
      </header>

      <div className="carry-ritual__machine-stage" data-printer-continuity>
        <div className="carry-ritual__secondary-intake" aria-hidden="true">
          <span>REPROCESSING REMAINDER</span>
        </div>
        <CarryForwardStub
          phase={state.phase}
          stubId={state.stubId}
          obligation={state.payload.obligation.text}
          onStartTear={() => dispatch({ type: 'START_TEAR' })}
          onSeparate={() => dispatch({ type: 'STUB_SEPARATED' })}
          onTearReleasedEarly={() => dispatch({ type: 'TEAR_RELEASED_EARLY' })}
          onStartAlignment={() => dispatch({ type: 'START_ALIGNMENT' })}
          onIntakeJam={() => dispatch({ type: 'FAIL', reason: 'intake-jam' })}
        >
          {transferVisible ? (
            <FieldTransferArtifact
              handoff={handoff}
              issued={state.phase === 'transfer-issued'}
              applyAvailable={Boolean(onApply)}
              onApply={() => {
                const ready = toCarryRitualHandoff(state)
                if (ready && onApply) onApply(ready)
              }}
              onAdjust={onAdjust}
              onCancel={onCancel}
            />
          ) : undefined}
        </CarryForwardStub>

        {showActuator && (
          <MechanicalActuator
            phase={state.phase}
            progress={state.actuatorProgress}
            milestone={state.actuatorMilestone}
            onMilestone={(milestone: ActuatorMilestone, progress: number) => dispatch({
              type: 'ACTUATOR_MILESTONE',
              milestone,
              progress,
            })}
            onRelease={() => dispatch({ type: 'ACTUATOR_RELEASED' })}
            onFallback={runActuatorFallback}
          />
        )}
      </div>

      {state.phase === 'released-early' && (
        <div className="carry-ritual__recovery-action">
          <p>The handle returned to zero. The receipt and stub are unchanged.</p>
          <button type="button" onClick={() => dispatch({ type: 'RESET_ACTUATOR' })}>
            RESET ACTUATOR
          </button>
        </div>
      )}

      {state.phase === 'recovery' && (
        <div className="carry-ritual__recovery-action" role="status">
          <p>{getRecoveryCopy(state.recoveryReason)}</p>
          <button type="button" onClick={() => dispatch({ type: 'RECOVER' })}>
            RECOVER SAME STUB
          </button>
          <button type="button" onClick={onCancel}>CANCEL WITHOUT CHANGING RECEIPT</button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {getAnnouncement(state.phase)}
      </p>
    </section>
  )
}

function getPhaseHeading(phase: CarryRitualPhase) {
  if (phase === 'extension-printing') return 'Printing the optional extension.'
  if (phase === 'extension-ready' || phase === 'tear-tension') return 'Separate only the unfinished thing.'
  if (phase === 'stub-separated') return 'Reinsert the same stub.'
  if (phase === 'stub-aligning' || phase === 'stub-intake') return 'The remainder is returning to the printer.'
  if (phase === 'actuator-revealing') return 'The conversion control is opening.'
  if (phase.startsWith('actuator-') || phase === 'released-early') return 'Convert the conditions, not the record.'
  if (phase === 'transform-registering') return 'Registering the changed conditions.'
  if (phase === 'transfer-issuing') return 'Issuing the Field Transfer.'
  if (phase === 'transfer-issued') return 'The same material now carries different conditions.'
  return 'The completed receipt is still valid.'
}

function getPhaseDescription(phase: CarryRitualPhase) {
  if (phase === 'extension-printing') return 'The completed receipt stays intact while one optional amendment prints below it.'
  if (phase === 'extension-ready') return 'Drag away from the perforation, or use the Tear control.'
  if (phase === 'tear-tension') return 'The paper is under tension. Release early and it returns safely.'
  if (phase === 'stub-separated') return 'Drag the stub toward the secondary intake, or use the reinsertion control.'
  if (phase === 'stub-aligning' || phase === 'stub-intake') return 'The printer is aligning and drawing in the exact same stub.'
  if (phase === 'actuator-revealing') return 'The paper mouth recedes while the actuator bay opens in the same chassis.'
  if (phase.startsWith('actuator-') || phase === 'released-early') return 'Push through easy, medium, heavy, and detent milestones. Nothing is sent automatically.'
  if (phase === 'transform-registering') return 'A translucent transfer layer is aligning over the original obligation.'
  if (phase === 'transfer-issuing') return 'The transformed stub is advancing back out of the same printer.'
  if (phase === 'transfer-issued') return 'Review, adjust, cancel, or apply when compiler integration is available.'
  return 'The completed receipt has not been changed.'
}

function getAnnouncement(phase: CarryRitualPhase) {
  if (phase === 'stub-separated') return 'Carry Forward stub separated. The completed receipt remains intact.'
  if (phase === 'actuator-detent') return 'Actuator detent reached.'
  if (phase === 'actuator-locked') return 'Actuator locked. Conversion registered.'
  if (phase === 'transfer-issued') return 'Field Transfer issued from the same Carry Forward stub.'
  if (phase === 'recovery') return 'The completed receipt is still valid. The physical ritual can be recovered.'
  return ''
}

function getRecoveryCopy(reason: CarryRitualState['recoveryReason']) {
  if (reason === 'tear-canceled') return 'The stub did not separate. The extension remains attached and can be tried again.'
  if (reason === 'intake-jam') return 'The intake did not capture the stub. The same separated stub is still available.'
  return 'Conversion did not register. The same stub can return to the actuator-ready boundary.'
}
