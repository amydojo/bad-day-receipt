import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from 'react'
import {
  carryForwardReducer,
  type CarryForwardEvent,
  type CarryForwardState,
  type FallbackReason,
} from '../carryForwardReducer'
import {
  clearCarryForwardSession,
  saveCarryForwardFallback,
  saveCarryForwardSession,
  type StoredCarryForwardFallback,
  type StoredCarryForwardSession,
} from '../carryForwardStorage'
import {
  copyPlanOutput,
  downloadPlanOutput,
} from '../carryForwardEffects'
import {
  ActionButton,
  InspectorSheet,
  InteractionPolicyCard,
  StatusBanner,
  TaskProgress,
  TaskStepShell,
} from '../CarryForwardPrimitives'
import { TaskStepRenderer, getStepActionLabel, isStepReady } from '../TaskStepRenderer'
import { createInteractionBudget, type InteractionPolicies } from '../interactionBudget'
import {
  getAdaptationItems,
  getCompletionProof,
  getWhyItems,
} from '../carryForwardPresentation'
import { emitCarryForwardTelemetry } from '../carryForwardTelemetry'
import { clearCarryRitualCheckpoint } from '../ritual/carryForwardRitualEffects'
import type { CarryRitualHandoff } from '../ritual/carryForwardRitualTypes'
import {
  createInTreeCompilingState,
  createInTreeRestoredState,
  startTrustedInTreeActivation,
  type InTreeApplyingStage,
} from './carryForwardIntegration'
import {
  clearInTreeCarryForwardHistoryStage,
  setInTreeCarryForwardHistoryStage,
} from './carryForwardNavigation'
import './carry-forward-runtime-host.css'
import '../carry-forward-parity.css'

const FALLBACK_COPY: Record<FallbackReason, { title: string; body: string }> = {
  offline: { title: 'You appear to be offline', body: 'The source stayed in this tab. You can make a manual plan or retry when connected.' },
  timeout: { title: 'The compiler took too long', body: 'No partial output was used. Your source is still available in this tab.' },
  rate_limited: { title: 'The compiler needs a moment', body: 'No partial output was used. Wait briefly or continue with a manual plan.' },
  refusal: { title: 'The compiler could not make this plan', body: 'No model text was shown. You can edit the source or make a manual plan.' },
  invalid_plan: { title: 'The plan did not pass validation', body: 'Nothing unsafe rendered. Your original task and source are still available.' },
  server_error: { title: 'The compiler is unavailable', body: 'Your source is still in this tab and has not been added to progress storage.' },
}

export function CarryForwardRuntimeHost({
  handoff,
  restored,
  onCancelToTransfer,
  onReturnToReceipt,
}: {
  handoff?: CarryRitualHandoff
  restored?: StoredCarryForwardSession | StoredCarryForwardFallback
  onCancelToTransfer?: () => void
  onReturnToReceipt: () => void
}) {
  const [state, dispatch] = useReducer(
    carryForwardReducer,
    { handoff, restored },
    ({ handoff: initialHandoff, restored: initialStored }) => {
      if (initialHandoff) return createInTreeCompilingState(initialHandoff)
      if (initialStored) return createInTreeRestoredState(initialStored)
      throw new Error('CarryForwardRuntimeHost requires a handoff or restored session.')
    },
  )
  const [applyingStages, setApplyingStages] = useState<InTreeApplyingStage[]>([])
  const [outputMessage, setOutputMessage] = useState('')
  const compileRunRef = useRef<ReturnType<typeof startTrustedInTreeActivation> | null>(null)
  const compileStartedAtRef = useRef(0)
  const firstActivationCompleteRef = useRef(Boolean(restored))

  useEffect(() => {
    if (state.kind !== 'compiling') return
    setApplyingStages([])
    compileStartedAtRef.current = performance.now()
    emitCarryForwardTelemetry('carry_forward_compile_started', { state: 'compiling' })

    let run: ReturnType<typeof startTrustedInTreeActivation> | null = null
    const frame = window.requestAnimationFrame(() => {
      run = startTrustedInTreeActivation({
        draft: state.draft,
        budget: state.budget,
        storage: window.localStorage,
        onStage: (stage) => {
          setApplyingStages((current) => current.includes(stage) ? current : [...current, stage])
          if (stage === 'required-facts-isolated') {
            dispatch({ type: 'COMPILE_PHASE', phase: 'validating-plan' })
          } else if (stage === 'goal-identified') {
            dispatch({ type: 'COMPILE_PHASE', phase: 'awaiting-plan' })
          }
        },
        onSuccess: ({ plan, startedAt, repaired, durationMs }) => {
          clearCarryRitualCheckpoint(window.sessionStorage)
          firstActivationCompleteRef.current = true
          emitCarryForwardTelemetry('carry_forward_compile_succeeded', {
            state: 'active',
            stepCount: plan.steps.length,
            repaired,
            durationMs,
          })
          dispatch({ type: 'COMPILE_SUCCESS', plan, startedAt })
        },
        onFailure: (reason) => {
          emitCarryForwardTelemetry('carry_forward_compile_failed', {
            state: 'fallback',
            errorCode: reason,
          })
          dispatch({ type: 'COMPILE_FAILURE', reason })
        },
        onTimeout: () => {
          emitCarryForwardTelemetry('carry_forward_compile_failed', {
            state: 'fallback',
            errorCode: 'timeout',
          })
          dispatch({ type: 'COMPILE_FAILURE', reason: 'timeout' })
        },
      })
      compileRunRef.current = run
    })

    return () => {
      window.cancelAnimationFrame(frame)
      run?.cancel()
      if (compileRunRef.current === run) compileRunRef.current = null
    }
  }, [state.kind])

  useEffect(() => {
    if (state.kind === 'fallback' && state.budget) {
      saveCarryForwardFallback(window.localStorage, {
        status: 'fallback',
        draft: state.draft,
        budget: state.budget,
        reason: state.reason,
        manualItems: state.manualItems,
        manualDraft: state.manualDraft,
      })
      return
    }
    if (state.kind !== 'active' && state.kind !== 'complete' && state.kind !== 'explaining') return
    saveCarryForwardSession(window.localStorage, {
      status: state.kind === 'complete' || (state.kind === 'explaining' && state.returnTo === 'complete')
        ? 'complete'
        : 'active',
      task: state.task,
      budget: state.budget,
      session: state.session,
    })
  }, [state])

  const budget = getActiveBudget(state)
  useEffect(() => {
    if (!budget) return
    const remaining = new Date(budget.expiresAt).getTime() - Date.now()
    if (remaining <= 0) {
      clearCarryForwardSession(window.localStorage)
      dispatch({ type: 'EXPIRE' })
      return
    }
    const timer = window.setTimeout(() => {
      clearCarryForwardSession(window.localStorage)
      dispatch({ type: 'EXPIRE' })
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [budget?.expiresAt])

  useEffect(() => {
    const stage = state.kind === 'compiling'
      ? 'applying'
      : state.kind === 'active' || state.kind === 'explaining'
        ? 'active'
        : state.kind === 'complete'
          ? 'complete'
          : state.kind === 'fallback'
            ? 'fallback'
            : null
    if (stage) setInTreeCarryForwardHistoryStage(stage, budget?.receiptId ?? null)
    return () => clearInTreeCarryForwardHistoryStage()
  }, [budget?.receiptId, state.kind])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-in-tree-runtime-heading], [data-screen-heading]')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [state.kind, state.kind === 'active' ? state.session.stepIndex : -1])

  const endMode = () => {
    if (state.kind === 'compiling') compileRunRef.current?.cancel()
    if (state.kind === 'active' || state.kind === 'explaining' || state.kind === 'complete') {
      emitCarryForwardTelemetry('carry_forward_ended', {
        state: 'active',
        stepCount: state.session.completedStepIds.length,
        durationMs: Math.max(0, Date.now() - new Date(state.session.startedAt).getTime()),
      })
    }
    clearCarryForwardSession(window.localStorage)
    clearInTreeCarryForwardHistoryStage()
    onReturnToReceipt()
  }

  const cancelApplying = () => {
    compileRunRef.current?.cancel()
    compileRunRef.current = null
    clearCarryForwardSession(window.localStorage)
    if (!firstActivationCompleteRef.current && onCancelToTransfer) {
      onCancelToTransfer()
      return
    }
    dispatch({ type: 'CANCEL_COMPILE' })
  }

  const completeStep = (activeState: Extract<CarryForwardState, { kind: 'active' }>) => {
    const step = activeState.session.plan.steps[activeState.session.stepIndex]
    if (!step || !isStepReady(step, activeState.session)) return
    emitCarryForwardTelemetry('carry_forward_step_completed', {
      state: 'active',
      stepKind: step.kind,
      stepIndex: activeState.session.stepIndex,
      stepCount: activeState.session.plan.steps.length,
    })
    if (activeState.session.stepIndex === activeState.session.plan.steps.length - 1) {
      emitCarryForwardTelemetry('carry_forward_completed', {
        state: 'complete',
        stepCount: activeState.session.plan.steps.length,
        durationMs: Math.max(0, Date.now() - new Date(activeState.session.startedAt).getTime()),
      })
    }
    dispatch({ type: 'COMPLETE_STEP' })
  }

  if (state.kind === 'compiling') {
    return (
      <ApplyingFieldTransfer
        stages={applyingStages}
        onCancel={cancelApplying}
        onEnd={endMode}
      />
    )
  }

  if (state.kind === 'active') {
    return (
      <div className="cf-in-tree-host cf-app" data-screen={getScreenCode(state)} data-field-transfer-status="applied">
        <ActiveWorkspace
          state={state}
          dispatch={dispatch}
          onEnd={endMode}
          onCompleteStep={() => completeStep(state)}
        />
      </div>
    )
  }

  if (state.kind === 'explaining') {
    const activeState: Extract<CarryForwardState, { kind: 'active' }> = {
      kind: 'active',
      task: state.task,
      budget: state.budget,
      session: state.session,
    }
    return (
      <div className="cf-in-tree-host cf-app" data-screen="M11" data-field-transfer-status="applied">
        {state.returnTo === 'active'
          ? (
              <ActiveWorkspace
                state={activeState}
                dispatch={dispatch}
                onEnd={endMode}
                onCompleteStep={() => completeStep(activeState)}
              />
            )
          : (
              <CompletionScreen
                state={{ kind: 'complete', task: state.task, budget: state.budget, session: state.session }}
                dispatch={dispatch}
                outputMessage={outputMessage}
                setOutputMessage={setOutputMessage}
                onReturn={endMode}
              />
            )}
        <RuntimeInspector state={state} dispatch={dispatch} onEnd={endMode} />
      </div>
    )
  }

  if (state.kind === 'complete') {
    return (
      <div className="cf-in-tree-host cf-app" data-screen="M12" data-field-transfer-status="applied">
        <CompletionScreen
          state={state}
          dispatch={dispatch}
          outputMessage={outputMessage}
          setOutputMessage={setOutputMessage}
          onReturn={endMode}
        />
      </div>
    )
  }

  if (state.kind === 'fallback') {
    return (
      <div className="cf-in-tree-host cf-app" data-screen="M14">
        <RuntimeShell label="FIELD TRANSFER · COMPILER RECOVERY" onEnd={endMode}>
          <FallbackScreen
            state={state}
            dispatch={dispatch}
            outputMessage={outputMessage}
            setOutputMessage={setOutputMessage}
            onEnd={endMode}
          />
        </RuntimeShell>
      </div>
    )
  }

  if (state.kind === 'budget' || state.kind === 'preview') {
    return (
      <div className="cf-in-tree-host cf-app" data-screen={state.kind === 'budget' ? 'M04' : 'M05'}>
        <RuntimeAdjustment state={state} dispatch={dispatch} onEnd={endMode} />
      </div>
    )
  }

  return (
    <RuntimeShell label="FIELD TRANSFER · EXPIRED" onEnd={endMode}>
      <div className="cf-authored-content">
        <span className="cf-eyebrow">SESSION EXPIRED</span>
        <h1 tabIndex={-1} data-in-tree-runtime-heading>This temporary task window is closed.</h1>
        <StatusBanner title="Context cleared">
          The isolated Carry Forward record was removed. Receipt history was not touched.
        </StatusBanner>
      </div>
      <div className="cf-authored-dock">
        <ActionButton onClick={endMode}>RETURN TO RECEIPT</ActionButton>
      </div>
    </RuntimeShell>
  )
}

function ApplyingFieldTransfer({
  stages,
  onCancel,
  onEnd,
}: {
  stages: InTreeApplyingStage[]
  onCancel: () => void
  onEnd: () => void
}) {
  const labels: Array<[InTreeApplyingStage, string]> = [
    ['goal-identified', 'Goal identified'],
    ['required-facts-isolated', 'Required facts isolated'],
    ['minimum-interface-ready', 'Minimum interface ready'],
  ]
  return (
    <main className="cf-in-tree-host cf-app cf-applying" data-screen="M06" data-field-transfer-status="applying">
      <RuntimeShell label="FT 027 · APPLYING" onEnd={onEnd}>
        <div className="cf-authored-content" aria-live="polite">
          <span className="cf-eyebrow">APPLYING FIELD TRANSFER</span>
          <h1 tabIndex={-1} data-in-tree-runtime-heading>Preparing the minimum necessary interface…</h1>
          <ol className="cf-compile-stages">
            {labels.map(([stage, label], index) => {
              const complete = stages.includes(stage)
              const active = !complete && stages.length === index
              return (
                <li key={stage} data-complete={complete || undefined} data-active={active || undefined}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{label.toUpperCase()}</strong>
                </li>
              )
            })}
          </ol>
          <div className="cf-invariant">
            <strong>NOTHING IS SENT AUTOMATICALLY.</strong>
            <p>The compiler has no tools and the active interface cannot render until validation and required persistence succeed.</p>
          </div>
        </div>
        <div className="cf-authored-dock">
          <ActionButton variant="quiet" onClick={onCancel}>CANCEL APPLY</ActionButton>
          <ActionButton variant="quiet" onClick={onEnd}>END MODE</ActionButton>
        </div>
      </RuntimeShell>
    </main>
  )
}

function ActiveWorkspace({
  state,
  dispatch,
  onEnd,
  onCompleteStep,
}: {
  state: Extract<CarryForwardState, { kind: 'active' }>
  dispatch: Dispatch<CarryForwardEvent>
  onEnd: () => void
  onCompleteStep: () => void
}) {
  const { plan } = state.session
  const step = plan.steps[state.session.stepIndex]
  const finalStep = state.session.stepIndex === plan.steps.length - 1
  return (
    <div className="cf-runtime cf-runtime--authored cf-runtime--in-tree">
      <aside className="cf-task-rail" aria-label="Task plan">
        <div className="cf-wordmark" aria-label="Bad Day Receipt">bad day<br />receipt</div>
        <div>
          <span className="cf-eyebrow">FT 027 APPLIED · {plan.steps.length} REQUIRED STEPS</span>
          <ol>
            {plan.steps.map((item, index) => (
              <li key={item.id} data-active={index === state.session.stepIndex || undefined} data-complete={state.session.completedStepIds.includes(item.id) || undefined}>
                <span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong>
              </li>
            ))}
          </ol>
        </div>
        <div className="cf-runtime-links">
          <button type="button" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'plan' })}>SHOW COMPLETE PLAN</button>
          <button type="button" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'why' })}>WHY THIS VIEW</button>
          <button type="button" onClick={onEnd}>END ONE THING MODE</button>
        </div>
      </aside>
      <main className="cf-workspace">
        <div className="cf-mobile-runtime-head"><span>FT 027 APPLIED</span><button type="button" onClick={onEnd}>END MODE</button></div>
        <TaskProgress steps={plan.steps} activeIndex={state.session.stepIndex} completedStepIds={state.session.completedStepIds} />
        <div className="cf-mobile-runtime-links">
          <button type="button" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'plan' })}>COMPLETE PLAN</button>
          <button type="button" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'why' })}>WHY THIS VIEW</button>
        </div>
        <TaskStepShell
          eyebrow={`STEP ${state.session.stepIndex + 1} OF ${plan.steps.length} · ${step.kind.toUpperCase()}`}
          title={step.title}
          headingRef={(node) => node?.setAttribute('data-in-tree-runtime-heading', '')}
          footer={(
            <div className="cf-step-actions">
              {state.session.stepIndex > 0 && <ActionButton variant="quiet" onClick={() => dispatch({ type: 'PREVIOUS_STEP' })}>BACK</ActionButton>}
              <ActionButton disabled={!isStepReady(step, state.session)} onClick={onCompleteStep}>{getStepActionLabel(step, finalStep)}</ActionButton>
            </div>
          )}
        >
          <TaskStepRenderer
            step={step}
            plan={plan}
            session={state.session}
            fewerDecisions={state.budget.policies.fewerDecisions}
            dispatch={dispatch}
          />
          {!state.budget.policies.oneStepAtATime && (
            <section className="cf-plan-context" aria-label="Visible plan context">
              <span className="cf-eyebrow">COMPLETE REQUIRED PLAN</span>
              <ol>{plan.steps.map((item, index) => <li key={item.id} data-current={index === state.session.stepIndex || undefined}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong><small>{index < state.session.stepIndex ? 'COMPLETE' : index === state.session.stepIndex ? 'CURRENT' : 'UPCOMING'}</small></li>)}</ol>
            </section>
          )}
        </TaskStepShell>
      </main>
    </div>
  )
}

function RuntimeInspector({
  state,
  dispatch,
  onEnd,
}: {
  state: Extract<CarryForwardState, { kind: 'explaining' }>
  dispatch: Dispatch<CarryForwardEvent>
  onEnd: () => void
}) {
  const close = () => dispatch({ type: 'CLOSE_WHY' })
  const title = state.inspector === 'why' ? 'Why this view?' : 'Complete plan'
  return (
    <InspectorSheet open title={title} descriptionId={state.inspector === 'why' ? 'cf-in-tree-why-description' : undefined} onClose={close}>
      {state.inspector === 'why' ? (
        <div className="cf-authored-inspector">
          <span className="cf-eyebrow">TRANSPARENCY ON DEMAND</span>
          <p id="cf-in-tree-why-description">These changes came from the Interaction Budget you approved. No emotional state was detected.</p>
          <ol className="cf-why-list">
            {getWhyItems(state.budget.policies, state.session.plan, state.session).map((item, index) => (
              <li key={item.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{item.change}</strong><p>{item.reason}</p></div>
              </li>
            ))}
          </ol>
          <StatusBanner title="What remained stable">The complete plan, every approved choice, your exit, and the no-automatic-action boundary remain available.</StatusBanner>
          <div className="cf-inspector-actions">
            <ActionButton onClick={close}>RETURN TO TASK</ActionButton>
            <ActionButton variant="secondary" onClick={() => dispatch({ type: 'ADJUST_ACTIVE_BUDGET' })}>ADJUST BUDGET</ActionButton>
            <ActionButton variant="quiet" onClick={onEnd}>END MODE</ActionButton>
          </div>
        </div>
      ) : (
        <div className="cf-authored-inspector">
          <span className="cf-eyebrow">COMPLETE PLAN · READ ONLY</span>
          <ol className="cf-inspector-plan">
            {state.session.plan.steps.map((step, index) => (
              <li key={step.id}>
                <strong>{step.title}</strong>
                <span>{state.session.completedStepIds.includes(step.id) ? 'COMPLETED' : index === state.session.stepIndex ? 'CURRENT' : 'UPCOMING'} · {step.kind.toUpperCase()}</span>
              </li>
            ))}
          </ol>
          <ActionButton onClick={close}>RETURN</ActionButton>
        </div>
      )}
    </InspectorSheet>
  )
}

function RuntimeAdjustment({
  state,
  dispatch,
  onEnd,
}: {
  state: Extract<CarryForwardState, { kind: 'budget' | 'preview' }>
  dispatch: Dispatch<CarryForwardEvent>
  onEnd: () => void
}) {
  if (state.kind === 'budget') {
    return (
      <RuntimeShell label="FT 027 APPLIED · ADJUSTMENT" onEnd={onEnd}>
        <div className="cf-authored-content">
          <span className="cf-eyebrow">ADJUST ACTIVE BUDGET</span>
          <h1 tabIndex={-1} data-in-tree-runtime-heading>What should this task ask less of?</h1>
          <p className="cf-authored-lede">These are your requests, not conclusions about you.</p>
          <div className="cf-policy-grid">
            {(Object.keys(state.policies) as Array<keyof InteractionPolicies>).map((policy) => (
              <InteractionPolicyCard key={policy} policy={policy} selected={state.policies[policy]} onToggle={() => dispatch({ type: 'TOGGLE_POLICY', policy })} />
            ))}
          </div>
        </div>
        <div className="cf-authored-dock">
          <ActionButton onClick={() => dispatch({
            type: 'PREVIEW',
            budget: createInteractionBudget({ policies: state.policies, receiptId: state.draft.receiptId }),
          })}>PREVIEW UPDATED VIEW</ActionButton>
          <ActionButton variant="quiet" onClick={() => dispatch({ type: 'BACK_TO_SOURCE' })}>BACK</ActionButton>
        </div>
      </RuntimeShell>
    )
  }

  return (
    <RuntimeShell label="FT 027 APPLIED · PREVIEW" onEnd={onEnd}>
      <div className="cf-authored-content">
        <span className="cf-eyebrow">BEFORE THE VIEW CHANGES</span>
        <h1 tabIndex={-1} data-in-tree-runtime-heading>One Thing Mode will…</h1>
        <ol className="cf-adaptation-list">
          {getAdaptationItems(state.budget.policies).map((item, index) => (
            <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.text}</strong></li>
          ))}
        </ol>
        <div className="cf-invariant"><strong>NOTHING WILL BE SENT AUTOMATICALLY.</strong><p>The layout changes only after another validated compile.</p></div>
      </div>
      <div className="cf-authored-dock">
        <ActionButton onClick={() => dispatch({ type: 'START_COMPILE' })}>APPLY UPDATED BUDGET</ActionButton>
        {state.resume && <ActionButton variant="secondary" onClick={() => dispatch({ type: 'RESTORE_ACTIVE_FROM_ADJUSTMENT' })}>RETURN TO TASK</ActionButton>}
        <ActionButton variant="quiet" onClick={onEnd}>END MODE</ActionButton>
      </div>
    </RuntimeShell>
  )
}

function FallbackScreen({
  state,
  dispatch,
  outputMessage,
  setOutputMessage,
  onEnd,
}: {
  state: Extract<CarryForwardState, { kind: 'fallback' }>
  dispatch: Dispatch<CarryForwardEvent>
  outputMessage: string
  setOutputMessage: (message: string) => void
  onEnd: () => void
}) {
  return (
    <>
      <div className="cf-authored-content">
        <span className="cf-eyebrow">SAFE MANUAL FALLBACK</span>
        <h1 tabIndex={-1} data-in-tree-runtime-heading>{FALLBACK_COPY[state.reason].title}</h1>
        <StatusBanner tone="warning" title="Nothing partial was used">{FALLBACK_COPY[state.reason].body}</StatusBanner>
        <fieldset className="cf-manual-list">
          <legend>MAKE A MANUAL 1–5 STEP PLAN</legend>
          {state.manualItems.map((item, index) => (
            <div key={index}>
              <label htmlFor={`in-tree-manual-${index}`}>{String(index + 1).padStart(2, '0')}</label>
              <input id={`in-tree-manual-${index}`} value={item} maxLength={160} onChange={(event) => dispatch({ type: 'UPDATE_MANUAL_ITEM', index, value: event.target.value })} />
              {state.manualItems.length > 1 && <button type="button" aria-label={`Remove manual step ${index + 1}`} onClick={() => dispatch({ type: 'REMOVE_MANUAL_ITEM', index })}>×</button>}
            </div>
          ))}
          {state.manualItems.length < 5 && <button type="button" className="cf-inline-action" onClick={() => dispatch({ type: 'ADD_MANUAL_ITEM' })}>+ ADD STEP</button>}
        </fieldset>
        <p className="cf-output-message" role="status">{outputMessage}</p>
      </div>
      <div className="cf-authored-dock">
        <ActionButton variant="secondary" disabled={!state.manualItems.some((item) => item.trim())} onClick={() => {
          const text = `${state.draft.task}\n\n${state.manualItems.filter((item) => item.trim()).map((item, index) => `${index + 1}. ${item.trim()}`).join('\n')}`
          void navigator.clipboard.writeText(text).then(() => setOutputMessage('MANUAL WORK COPIED')).catch(() => setOutputMessage('COPY FAILED'))
        }}>COPY MANUAL WORK</ActionButton>
        <ActionButton onClick={() => dispatch({ type: 'RETRY_COMPILE' })} disabled={!state.budget}>RETRY COMPILER</ActionButton>
        <ActionButton variant="quiet" onClick={onEnd}>END MODE</ActionButton>
      </div>
    </>
  )
}

function CompletionScreen({
  state,
  dispatch,
  outputMessage,
  setOutputMessage,
  onReturn,
}: {
  state: Extract<CarryForwardState, { kind: 'complete' }>
  dispatch: Dispatch<CarryForwardEvent>
  outputMessage: string
  setOutputMessage: (message: string) => void
  onReturn: () => void
}) {
  const proof = getCompletionProof(state.session.plan, state.session)
  return (
    <main className="cf-authored-shell cf-completion" data-state="M12">
      <header className="cf-authored-system-bar"><span>FT 027 APPLIED</span><span>PRIVATE · TEMPORARY</span></header>
      <section className="cf-authored-scene">
        <div className="cf-authored-content">
          <span className="cf-eyebrow cf-success">TRANSACTION COMPLETE</span>
          <h1 tabIndex={-1} data-in-tree-runtime-heading>One thing closed.</h1>
          <article className="cf-completion-proof"><span>{proof.taskTitle}</span><strong>PREPARED FOR REVIEW</strong><p>{proof.requiredCompleted} of {proof.requiredTotal} required steps completed<br />{proof.draftsPrepared} draft{proof.draftsPrepared === 1 ? '' : 's'} prepared<br />{proof.laterCount} Later item{proof.laterCount === 1 ? '' : 's'} preserved</p></article>
          <StatusBanner tone="success" title="No external action is being claimed">Carry Forward prepared the in-app work. It did not send, submit, file, approve, or resolve anything outside this interface.</StatusBanner>
          <details className="cf-completion-details">
            <summary>OUTPUT AND FULL DETAILS</summary>
            <p>{state.session.plan.summary}</p>
            <div>
              <ActionButton variant="quiet" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'plan' })}>SHOW COMPLETE PLAN</ActionButton>
              <ActionButton variant="secondary" onClick={() => {
                void copyPlanOutput(state.session.plan, state.session).then(() => setOutputMessage('PLAN COPIED')).catch(() => setOutputMessage('COPY FAILED'))
              }}>COPY PLAN</ActionButton>
              <ActionButton variant="secondary" onClick={() => {
                try { downloadPlanOutput(state.session.plan, state.session); setOutputMessage('PLAN DOWNLOADED') } catch { setOutputMessage('DOWNLOAD FAILED') }
              }}>DOWNLOAD PLAN</ActionButton>
            </div>
          </details>
          <p className="cf-output-message" role="status">{outputMessage}</p>
        </div>
        <div className="cf-authored-dock">
          <ActionButton onClick={onReturn}>RETURN TO RECEIPT</ActionButton>
          <ActionButton variant="quiet" onClick={onReturn}>CLEAR NOW</ActionButton>
        </div>
      </section>
    </main>
  )
}

function RuntimeShell({
  label,
  onEnd,
  children,
}: {
  label: string
  onEnd: () => void
  children: React.ReactNode
}) {
  return (
    <main className="cf-authored-shell">
      <header className="cf-authored-system-bar"><span>{label}</span><button type="button" onClick={onEnd}>END MODE</button></header>
      <section className="cf-authored-scene">{children}</section>
    </main>
  )
}

function getActiveBudget(state: CarryForwardState) {
  if (state.kind === 'preview' || state.kind === 'compiling' || state.kind === 'active' || state.kind === 'explaining' || state.kind === 'complete') return state.budget
  if (state.kind === 'fallback') return state.budget
  return null
}

function getScreenCode(state: Extract<CarryForwardState, { kind: 'active' }>) {
  const step = state.session.plan.steps[state.session.stepIndex]
  return step.kind === 'choice' ? 'M07'
    : step.kind === 'read' || step.kind === 'checklist' ? 'M08'
      : step.kind === 'compose' ? 'M09' : 'M10'
}
