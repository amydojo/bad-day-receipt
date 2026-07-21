import {
  useEffect,
  useReducer,
  useRef,
} from 'react'
import {
  ActionButton,
  InputField,
  StatusBanner,
} from '../CarryForwardPrimitives'
import { hasConcreteTask } from '../taskAmbiguity'
import {
  createInteractionBudget,
  type InteractionPolicies,
} from '../interactionBudget'
import { TASK_PLAN_LIMITS } from '../taskPlanLimits'
import {
  carryDesignationReducer,
  createInitialCarryDesignationState,
} from './carryDesignationReducer'
import type {
  CarryDesignationOrigin,
  CarryDesignationState,
  RemainingObligation,
} from './carryDesignationTypes'
import {
  confirmObligation,
  createManualObligation,
} from './obligationProvenance'
import { ObligationSuggestion } from './ObligationSuggestion'
import { OneThingPreset } from './OneThingPreset'
import { OptionalSourceDisclosure } from './OptionalSourceDisclosure'
import './carry-designation.css'

export function CarryForwardDesignation({
  origin,
  onNothingAfterAll,
}: {
  origin: CarryDesignationOrigin
  onNothingAfterAll: () => void
}) {
  const [state, dispatch] = useReducer(
    carryDesignationReducer,
    origin,
    createInitialCarryDesignationState,
  )
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    if (state.kind === 'customizing') return
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [state.kind])

  const resetAndEnd = () => {
    dispatch({ type: 'RESET', state: createInitialCarryDesignationState(origin) })
    onNothingAfterAll()
  }

  const confirmCandidate = (obligation: RemainingObligation) => {
    dispatch({
      type: 'SELECT_SUGGESTION',
      obligation: confirmObligation(obligation),
    })
  }

  const confirmManual = () => {
    if (state.kind !== 'editing') return
    if (!hasConcreteTask(state.draft)) {
      dispatch({
        type: 'MANUAL_INVALID',
        message: 'Name one concrete action, such as reply, choose, prepare, review, or submit.',
      })
      return
    }
    const obligation = createManualObligation(state.draft)
    if (!obligation) {
      dispatch({ type: 'MANUAL_INVALID', message: 'Name one remaining obligation before continuing.' })
      return
    }
    dispatch({
      type: 'CONFIRM_MANUAL',
      obligation: confirmObligation(obligation),
    })
  }

  const issueAdjustment = (preset: Extract<CarryDesignationState, { kind: 'preset' }>) => {
    const budget = createInteractionBudget({
      policies: preset.policies,
      receiptId: origin.kind === 'receipt' ? origin.receiptId : null,
    })
    dispatch({ type: 'ISSUE_ADJUSTMENT', budget, origin: origin.kind })
  }

  return (
    <section
      className="carry-designation"
      data-carry-designation-state={state.kind}
      data-carry-designation-origin={origin.kind}
      aria-labelledby="carry-designation-heading"
    >
      {renderState({
        state,
        headingRef,
        dispatch,
        confirmCandidate,
        confirmManual,
        issueAdjustment,
        resetAndEnd,
      })}
    </section>
  )
}

function renderState({
  state,
  headingRef,
  dispatch,
  confirmCandidate,
  confirmManual,
  issueAdjustment,
  resetAndEnd,
}: {
  state: CarryDesignationState
  headingRef: React.RefObject<HTMLHeadingElement | null>
  dispatch: React.Dispatch<Parameters<typeof carryDesignationReducer>[1]>
  confirmCandidate: (obligation: RemainingObligation) => void
  confirmManual: () => void
  issueAdjustment: (state: Extract<CarryDesignationState, { kind: 'preset' }>) => void
  resetAndEnd: () => void
}) {
  if (state.kind === 'choosing') {
    return (
      <>
        <header className="carry-designation__header">
          <p className="cf-eyebrow">CARRY FORWARD · DESIGNATE</p>
          <h2 id="carry-designation-heading" ref={headingRef} tabIndex={-1}>
            What is still asking something from you?
          </h2>
          <p>One thing is enough. Only you can designate it.</p>
        </header>
        <ObligationSuggestion
          suggestion={state.suggestion}
          alternatives={state.alternatives}
          onConfirm={confirmCandidate}
          onEdit={(obligation) => dispatch({ type: 'EDIT_SUGGESTION', text: obligation.text })}
          onChooseOther={() => dispatch({ type: 'CHOOSE_SOMETHING_ELSE' })}
        />
        <ActionButton variant="quiet" onClick={resetAndEnd}>NOTHING AFTER ALL</ActionButton>
      </>
    )
  }

  if (state.kind === 'editing') {
    return (
      <>
        <header className="carry-designation__header">
          <p className="cf-eyebrow">CARRY FORWARD · DESIGNATE</p>
          <h2 id="carry-designation-heading" ref={headingRef} tabIndex={-1}>
            What is still asking something from you?
          </h2>
          <p>One thing is enough. Only you can designate it.</p>
        </header>
        <InputField
          id="carry-designation-task"
          label="ONE REMAINING OBLIGATION"
          hint="Name an action, not the whole situation. No receipt line or model output can fill this field for you."
          error={state.error}
          value={state.draft}
          onChange={(value) => dispatch({ type: 'UPDATE_DRAFT', value })}
          maxLength={TASK_PLAN_LIMITS.task}
          placeholder="Reply to…"
        />
        <div className="carry-designation__actions">
          <ActionButton disabled={state.draft.trim().length < 3} onClick={confirmManual}>
            USE THIS ONE
          </ActionButton>
          <ActionButton variant="quiet" onClick={resetAndEnd}>NOTHING AFTER ALL</ActionButton>
        </div>
      </>
    )
  }

  if (state.kind === 'source') {
    return (
      <>
        <header className="carry-designation__header">
          <p className="cf-eyebrow">DESIGNATED BY YOU</p>
          <h2 id="carry-designation-heading" ref={headingRef} tabIndex={-1}>
            Give the task only what it needs.
          </h2>
          <p className="carry-designation__obligation">{state.obligation.text}</p>
        </header>
        <OptionalSourceDisclosure
          expanded={state.sourceExpanded}
          value={state.sourceText}
          onExpand={() => dispatch({ type: 'EXPAND_SOURCE' })}
          onCollapse={() => dispatch({ type: 'COLLAPSE_SOURCE' })}
          onChange={(value) => dispatch({ type: 'UPDATE_SOURCE', value })}
        />
        <StatusBanner title="Private task boundary">
          The obligation and optional source remain outside receipt history, receipt exports, and receipt analytics.
        </StatusBanner>
        <div className="carry-designation__actions">
          <ActionButton onClick={() => dispatch({ type: 'CONTINUE_TO_PRESET' })}>
            REVIEW ONE THING MODE
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => dispatch({ type: 'BACK_TO_OBLIGATION' })}>
            EDIT DESIGNATION
          </ActionButton>
          <ActionButton variant="quiet" onClick={resetAndEnd}>NOTHING AFTER ALL</ActionButton>
        </div>
      </>
    )
  }

  if (state.kind === 'preset' || state.kind === 'customizing') {
    const preset: Extract<CarryDesignationState, { kind: 'preset' }> = {
      kind: 'preset',
      obligation: state.obligation,
      sourceText: state.sourceText,
      policies: state.policies,
    }
    return (
      <>
        <header className="carry-designation__header carry-designation__header--compact">
          <p className="cf-eyebrow">DESIGNATED BY YOU</p>
          <h2 id="carry-designation-heading" ref={headingRef} tabIndex={-1}>
            Approve how this task should ask less of you.
          </h2>
          <p className="carry-designation__obligation">{state.obligation.text}</p>
        </header>
        <OneThingPreset
          policies={state.policies}
          customizing={state.kind === 'customizing'}
          onIssue={() => issueAdjustment(preset)}
          onOpenCustomize={() => dispatch({ type: 'OPEN_CUSTOMIZE' })}
          onTogglePolicy={(policy: keyof InteractionPolicies) => dispatch({ type: 'TOGGLE_POLICY', policy })}
          onCloseCustomize={() => dispatch({ type: 'CLOSE_CUSTOMIZE' })}
        />
        <div className="carry-designation__actions carry-designation__actions--quiet">
          <ActionButton variant="secondary" onClick={() => dispatch({ type: 'BACK_TO_OBLIGATION' })}>
            BACK TO CONTEXT
          </ActionButton>
          <ActionButton variant="quiet" onClick={resetAndEnd}>NOTHING AFTER ALL</ActionButton>
        </div>
      </>
    )
  }

  if (state.kind === 'ritual-ready') {
    return (
      <section className="carry-designation__ready" data-carry-ritual-ready>
        <p className="cf-eyebrow">ADJUSTMENT PREPARED</p>
        <h2 id="carry-designation-heading" ref={headingRef} tabIndex={-1}>
          The adjustment is ready to be issued.
        </h2>
        <p>Nothing has been compiled or applied yet.</p>
        <dl>
          <div><dt>DESIGNATED THING</dt><dd>{state.obligation.text}</dd></div>
          <div><dt>ORIGIN</dt><dd>{state.origin === 'receipt' ? 'COMPLETED RECEIPT' : 'DIRECT ENTRY'}</dd></div>
          <div><dt>SOURCE</dt><dd>{state.sourceText ? 'OPTIONAL CONTEXT PRESENT' : 'NONE ADDED'}</dd></div>
          <div><dt>COMPILER</dt><dd>NOT CALLED</dd></div>
        </dl>
        <StatusBanner title="No change yet">
          The designated task and adjustment remain local. The receipt is unchanged, and nothing has been compiled or applied.
        </StatusBanner>
        <div className="carry-designation__actions">
          <ActionButton variant="secondary" onClick={() => dispatch({ type: 'RETURN_TO_PRESET' })}>
            REVIEW ADJUSTMENT
          </ActionButton>
          <ActionButton variant="quiet" onClick={resetAndEnd}>NOTHING AFTER ALL</ActionButton>
        </div>
      </section>
    )
  }

  return (
    <section className="carry-designation__recovery">
      <p className="cf-eyebrow">DESIGNATION STILL LOCAL</p>
      <h2 id="carry-designation-heading" ref={headingRef} tabIndex={-1}>
        The adjustment needs one correction.
      </h2>
      <p>Nothing has been compiled, sent, or added to receipt history.</p>
      <ActionButton onClick={() => dispatch({ type: 'EDIT_AFTER_RECOVERY' })}>EDIT DESIGNATION</ActionButton>
      <ActionButton variant="quiet" onClick={resetAndEnd}>NOTHING AFTER ALL</ActionButton>
    </section>
  )
}
