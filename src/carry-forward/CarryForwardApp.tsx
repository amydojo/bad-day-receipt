import { useEffect, useReducer, useRef, useState } from 'react'
import {
  carryForwardReducer,
  createInitialCarryForwardState,
  type CarryForwardEvent,
  type CarryForwardState,
  type FallbackReason,
  type RuntimeSession,
} from './carryForwardReducer'
import {
  clearCarryForwardSession,
  consumeReceiptSeed,
  loadCarryForwardSession,
  saveCarryForwardFallback,
  saveCarryForwardSession,
} from './carryForwardStorage'
import {
  CarryForwardCompileError,
  compileCarryForwardTask,
  copyPlanOutput,
  downloadPlanOutput,
} from './carryForwardEffects'
import { startCarryForwardCompileRun } from './carryForwardCompileRun'
import {
  createInteractionBudget,
  DEFAULT_INTERACTION_POLICIES,
  type InteractionPolicies,
} from './interactionBudget'
import {
  ActionButton,
  InputField,
  InspectorSheet,
  InteractionPolicyCard,
  POLICY_COPY,
  StatusBanner,
  TaskProgress,
  TaskStepShell,
} from './CarryForwardPrimitives'
import { isStepReady, TaskStepRenderer } from './TaskStepRenderer'
import {
  emitCarryForwardTelemetry,
  type CarryForwardTelemetryProperties,
} from './carryForwardTelemetry'
import type { ValidatedTaskPlan } from './taskPlanSchema'
import { INSURANCE_DENIAL_SOURCE, INSURANCE_DENIAL_TASK } from './fixtures'
import { TASK_PLAN_LIMITS } from './taskPlanLimits'
import { hasConcreteTask } from './taskAmbiguity'

const COMPILE_PHASES = [
  { id: 'request-accepted', label: 'Request accepted' },
  { id: 'awaiting-plan', label: 'Awaiting bounded plan' },
  { id: 'validating-plan', label: 'Plan received · verifying source evidence' },
] as const

const FALLBACK_COPY: Record<FallbackReason, { title: string; body: string }> = {
  offline: { title: 'You appear to be offline', body: 'The source stayed in this tab. You can make a manual plan or retry when connected.' },
  timeout: { title: 'The compiler took too long', body: 'No partial output was used. Your source is still available in this tab.' },
  rate_limited: { title: 'The compiler needs a moment', body: 'No partial output was used. Wait briefly or continue with a manual plan.' },
  refusal: { title: 'The compiler could not make this plan', body: 'No model text was shown. You can edit the source or make a manual plan.' },
  invalid_plan: { title: 'The plan did not pass validation', body: 'Nothing unsafe rendered. Your original task and source are still available.' },
  server_error: { title: 'The compiler is unavailable', body: 'Your source is still in this tab and has not been added to progress storage.' },
}

function getStateCode(state: CarryForwardState) {
  if (state.kind === 'input' && state.error) return 'M13'
  if (state.kind === 'input') return state.screen === 'task' ? (state.draft.task ? 'M02' : 'M01') : 'M03'
  if (state.kind === 'budget') return 'M04'
  if (state.kind === 'preview') return 'M05'
  if (state.kind === 'compiling') return 'M06'
  if (state.kind === 'explaining') return 'M11'
  if (state.kind === 'complete') return 'M12'
  if (state.kind === 'fallback') return 'M14'
  if (state.kind === 'expired') return 'M15'
  const step = state.session.plan.steps[state.session.stepIndex]
  return step.kind === 'choice' ? 'M07'
    : step.kind === 'read' || step.kind === 'checklist' ? 'M08'
      : step.kind === 'compose' ? 'M09' : 'M10'
}

function activeBudget(state: CarryForwardState) {
  if (state.kind === 'preview' || state.kind === 'compiling' || state.kind === 'active'
    || state.kind === 'explaining' || state.kind === 'complete') return state.budget
  if (state.kind === 'fallback') return state.budget
  return null
}

function initialSession(plan: ValidatedTaskPlan, startedAt: string): RuntimeSession {
  return {
    plan,
    stepIndex: 0,
    completedStepIds: [],
    choices: {},
    checkedItems: {},
    composeDrafts: {},
    expandedChoices: {},
    startedAt,
  }
}

function telemetryPolicies(policies: InteractionPolicies): CarryForwardTelemetryProperties {
  return { ...policies }
}

function RuntimeInspector({ state, dispatch }: {
  state: Extract<CarryForwardState, { kind: 'explaining' }>
  dispatch: React.Dispatch<CarryForwardEvent>
}) {
  return (
    <InspectorSheet
      open
      title={state.inspector === 'plan' ? 'Complete plan' : 'Why this view'}
      onClose={() => dispatch({ type: 'CLOSE_WHY' })}
    >
      {state.inspector === 'why' ? (
        <>
          <section className="cf-inspector-section">
            <span className="cf-eyebrow">USER-DECLARED POLICIES</span>
            <dl className="cf-inspector-policies">
              {(Object.keys(state.budget.policies) as Array<keyof InteractionPolicies>).map((policy) => (
                <div key={policy}>
                  <dt>{POLICY_COPY[policy].title}</dt>
                  <dd>{state.budget.policies[policy] ? 'REQUESTED' : 'NOT REQUESTED'} · {POLICY_COPY[policy].body}</dd>
                </div>
              ))}
            </dl>
          </section>
          <StatusBanner title="Product invariant">Nothing will be sent, submitted, purchased, deleted, or changed automatically.</StatusBanner>
          <StatusBanner title="Product invariant">The complete plan and exit remain available from every active step.</StatusBanner>
        </>
      ) : (
        <>
      <section className="cf-inspector-section">
        <span className="cf-eyebrow">DECLARED BUDGET</span>
        <dl className="cf-inspector-policies">
          {(Object.keys(state.budget.policies) as Array<keyof InteractionPolicies>).map((policy) => (
            <div key={policy}>
              <dt>{POLICY_COPY[policy].title}</dt>
              <dd>{state.budget.policies[policy] ? 'ON' : 'OFF'} · {POLICY_COPY[policy].body}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="cf-inspector-section">
        <span className="cf-eyebrow">REQUIRED PLAN</span>
        <ol className="cf-inspector-plan">
          {state.session.plan.steps.map((step, index) => (
            <li key={step.id}>
              <strong>{step.title}</strong>
              <span>{state.session.completedStepIds.includes(step.id)
                ? 'COMPLETED'
                : index === state.session.stepIndex
                  ? 'CURRENT'
                  : 'UPCOMING'} · {step.kind.toUpperCase()}</span>
            </li>
          ))}
        </ol>
      </section>
      {state.session.plan.extractedFacts.length > 0 && (
        <section className="cf-inspector-section">
          <span className="cf-eyebrow">EXACT EVIDENCE</span>
          {state.session.plan.extractedFacts.map((fact) => (
            <details className="cf-evidence" key={fact.id}>
              <summary><span>{fact.label}</span><strong>{fact.value}</strong></summary>
              <blockquote>{fact.evidenceQuote}</blockquote>
            </details>
          ))}
        </section>
      )}
      {state.session.plan.later.length > 0 && (
        <section className="cf-inspector-section cf-later">
          <span className="cf-eyebrow">{state.budget.policies.deferOptionalWork ? 'LATER' : 'OPTIONAL'} · WHOLE NONREQUIRED TASKS</span>
          {state.session.plan.later.map((item) => (
            <article key={item.id}><h3>{item.title}</h3><p>{item.body}</p></article>
          ))}
        </section>
      )}
        </>
      )}
    </InspectorSheet>
  )
}

function ActiveWorkspace({
  state,
  dispatch,
  headingRef,
  onEnd,
  onCompleteStep,
}: {
  state: Extract<CarryForwardState, { kind: 'active' }>
  dispatch: React.Dispatch<CarryForwardEvent>
  headingRef: React.Ref<HTMLHeadingElement>
  onEnd: () => void
  onCompleteStep: () => void
}) {
  const { plan } = state.session
  const step = plan.steps[state.session.stepIndex]
  const ready = isStepReady(step, state.session)

  return (
    <div className="cf-runtime">
      <aside className="cf-task-rail" aria-label="Task plan">
        <a href="/" className="cf-wordmark">bad day<br />receipt</a>
        <div>
          <span className="cf-eyebrow">TASK PLAN · {plan.steps.length} STEPS</span>
          <ol>
            {plan.steps.map((item, index) => (
              <li key={item.id} data-active={index === state.session.stepIndex || undefined} data-complete={state.session.completedStepIds.includes(item.id) || undefined}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.title}</strong>
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
        <div className="cf-mobile-runtime-head">
          <a href="/" className="cf-wordmark">bad day receipt</a>
          <button type="button" onClick={onEnd}>END MODE</button>
        </div>
        <TaskProgress steps={plan.steps} activeIndex={state.session.stepIndex} completedStepIds={state.session.completedStepIds} />
        <div className="cf-mobile-runtime-links">
          <button type="button" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'plan' })}>COMPLETE PLAN</button>
          <button type="button" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'why' })}>WHY THIS VIEW</button>
        </div>
        <TaskStepShell
          eyebrow={`STEP ${state.session.stepIndex + 1} OF ${plan.steps.length} · ${step.kind.toUpperCase()}`}
          title={step.title}
          headingRef={headingRef}
          footer={(
            <div className="cf-step-actions">
              {state.session.stepIndex > 0 && (
                <ActionButton variant="quiet" onClick={() => dispatch({ type: 'PREVIOUS_STEP' })}>BACK</ActionButton>
              )}
              <ActionButton disabled={!ready} onClick={onCompleteStep}>
                {state.session.stepIndex === plan.steps.length - 1 ? 'FINISH PLAN' : 'COMPLETE STEP'}
              </ActionButton>
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
              <span className="cf-eyebrow">PLAN CONTEXT · ONE STEP POLICY OFF</span>
              <ol>
                {plan.steps.map((planStep, index) => (
                  <li key={planStep.id} data-current={index === state.session.stepIndex || undefined}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{planStep.title}</strong>
                    <small>{index < state.session.stepIndex ? 'COMPLETE' : index === state.session.stepIndex ? 'CURRENT' : 'UPCOMING'}</small>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </TaskStepShell>
      </main>
    </div>
  )
}

export default function CarryForwardApp() {
  const [state, dispatch] = useReducer(carryForwardReducer, undefined, () => createInitialCarryForwardState())
  const [outputMessage, setOutputMessage] = useState('')
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const compileStartedAtRef = useRef(0)

  useEffect(() => {
    document.title = 'Carry Forward · Bad Day Receipt'
    const stored = loadCarryForwardSession(window.localStorage)
    if (stored.status === 'ready') {
      if (stored.value.status === 'fallback') {
        dispatch({
          type: 'RESTORE_FALLBACK',
          draft: stored.value.draft,
          budget: stored.value.budget,
          reason: stored.value.reason,
          manualItems: stored.value.manualItems,
          manualDraft: stored.value.manualDraft,
        })
      } else {
        dispatch({
          type: 'RESTORE_SESSION',
          status: stored.value.status,
          task: stored.value.task,
          budget: stored.value.budget,
          session: stored.value.session,
        })
      }
    } else if (stored.status === 'expired') {
      dispatch({ type: 'EXPIRE' })
    } else {
      const receiptId = consumeReceiptSeed(window.sessionStorage)
      if (receiptId) dispatch({ type: 'APPLY_RECEIPT_SEED', receiptId })
    }
    emitCarryForwardTelemetry('carry_forward_opened', { state: 'input' })
  }, [])

  useEffect(() => {
    const animation = window.requestAnimationFrame(() => headingRef.current?.focus())
    return () => window.cancelAnimationFrame(animation)
  }, [state.kind, state.kind === 'input' ? state.screen : '', state.kind === 'active' ? state.session.stepIndex : -1])

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
    const status = state.kind === 'complete' || (state.kind === 'explaining' && state.returnTo === 'complete')
      ? 'complete' as const
      : 'active' as const
    saveCarryForwardSession(window.localStorage, {
      status,
      task: state.task,
      budget: state.budget,
      session: state.session,
    })
  }, [state])

  const budget = activeBudget(state)
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
    if (state.kind !== 'compiling') return
    const snapshot = state
    const phaseFrame = window.requestAnimationFrame(() => dispatch({ type: 'COMPILE_PHASE', phase: 'awaiting-plan' }))

    const handleFailure = (error: unknown) => {
      const reason = error instanceof CarryForwardCompileError ? error.reason : 'server_error'
      emitCarryForwardTelemetry('carry_forward_compile_failed', { state: 'fallback', errorCode: reason })
      dispatch({ type: 'COMPILE_FAILURE', reason })
    }
    const run = startCarryForwardCompileRun({
      execute: (signal) => compileCarryForwardTask({ draft: snapshot.draft, budget: snapshot.budget, signal }),
      onSuccess: (result) => {
        dispatch({ type: 'COMPILE_PHASE', phase: 'validating-plan' })
        const startedAt = new Date().toISOString()
        const session = initialSession(result.plan, startedAt)
        const persisted = saveCarryForwardSession(window.localStorage, {
          status: 'active',
          task: snapshot.draft.task,
          budget: snapshot.budget,
          session,
        })
        if (!persisted) {
          emitCarryForwardTelemetry('carry_forward_compile_failed', { state: 'fallback', errorCode: 'server_error' })
          dispatch({ type: 'COMPILE_FAILURE', reason: 'server_error' })
          return
        }
        emitCarryForwardTelemetry('carry_forward_compile_succeeded', {
          state: 'active',
          stepCount: result.plan.steps.length,
          repaired: result.repaired,
          durationMs: Math.max(0, performance.now() - compileStartedAtRef.current),
        })
        dispatch({ type: 'COMPILE_SUCCESS', plan: result.plan, startedAt })
      },
      onFailure: handleFailure,
      onTimeout: () => handleFailure(new CarryForwardCompileError('timeout')),
    })
    void run.promise

    return () => {
      window.cancelAnimationFrame(phaseFrame)
      run.cancel()
    }
  }, [state.kind])

  const startCompile = () => {
    compileStartedAtRef.current = performance.now()
    emitCarryForwardTelemetry('carry_forward_compile_started', { state: 'compiling' })
    dispatch({ type: 'START_COMPILE' })
  }

  const reset = () => {
    clearCarryForwardSession(window.localStorage)
    dispatch({ type: 'RESET' })
  }

  const endMode = () => {
    if (state.kind !== 'active' && state.kind !== 'explaining') return
    const hasWork = state.session.completedStepIds.length > 0
      || Object.keys(state.session.choices).length > 0
      || Object.keys(state.session.checkedItems).length > 0
      || Object.keys(state.session.composeDrafts).length > 0
    if (hasWork && !window.confirm('End One Thing Mode and clear this temporary task?')) return
    emitCarryForwardTelemetry('carry_forward_ended', {
      state: 'active',
      stepCount: state.session.completedStepIds.length,
      durationMs: Math.max(0, Date.now() - new Date(state.session.startedAt).getTime()),
    })
    reset()
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

  const trackOutput = (outputKind: 'copy' | 'download', outcome: 'success' | 'failure', manual: boolean) => {
    emitCarryForwardTelemetry('carry_forward_output_completed', { outputKind, outcome, manual })
  }

  const screenCode = getStateCode(state)

  if (state.kind === 'active') {
    return <div className="cf-app" data-screen={screenCode}><ActiveWorkspace state={state} dispatch={dispatch} headingRef={headingRef} onEnd={endMode} onCompleteStep={() => completeStep(state)} /></div>
  }

  if (state.kind === 'explaining') {
    const activeState: Extract<CarryForwardState, { kind: 'active' }> = {
      kind: 'active',
      task: state.task,
      budget: state.budget,
      session: state.session,
    }
    return (
      <div className="cf-app" data-screen={screenCode}>
        {state.returnTo === 'active'
          ? <ActiveWorkspace state={activeState} dispatch={dispatch} headingRef={headingRef} onEnd={endMode} onCompleteStep={() => completeStep(activeState)} />
          : <CompleteScreen state={{ ...state, kind: 'complete' }} dispatch={dispatch} headingRef={headingRef} outputMessage={outputMessage} setOutputMessage={setOutputMessage} onReset={reset} onOutput={trackOutput} />}
        <RuntimeInspector state={state} dispatch={dispatch} />
      </div>
    )
  }

  if (state.kind === 'complete') {
    return (
      <div className="cf-app" data-screen={screenCode}>
        <CompleteScreen state={state} dispatch={dispatch} headingRef={headingRef} outputMessage={outputMessage} setOutputMessage={setOutputMessage} onReset={reset} onOutput={trackOutput} />
      </div>
    )
  }

  return (
    <div className="cf-app" data-screen={screenCode}>
      <header className="cf-masthead">
        <a href="/" className="cf-wordmark">bad day<br />receipt</a>
        <div className="cf-masthead__meta">
          <span>CARRY FORWARD · {screenCode}</span>
          <span><i aria-hidden="true" /> LOCAL-FIRST · 4 HOUR WINDOW</span>
        </div>
      </header>
      <main className="cf-intake-shell">
        <aside className="cf-intake-context" aria-label="Carry Forward context">
          <span className="cf-eyebrow">WHEN A RECEIPT BECOMES A TASK</span>
          <h2>Carry one thing forward.</h2>
          <p>Turn a heavy, real-world task into a small deterministic plan—without turning the model into the product.</p>
          <ol aria-label="Carry Forward stages">
            <li data-active={state.kind === 'input' || undefined}>01 · INPUT</li>
            <li data-active={state.kind === 'budget' || undefined}>02 · BUDGET</li>
            <li data-active={state.kind === 'preview' || state.kind === 'compiling' || undefined}>03 · COMPILE</li>
            <li>04 · DO</li>
          </ol>
        </aside>
        <section className="cf-intake-card">
          {state.kind === 'input' && state.screen === 'task' && (
            <>
              <span className="cf-eyebrow">01 · NAME THE TASK</span>
              <h1 ref={headingRef} tabIndex={-1}>What needs to get done?</h1>
              {state.draft.receiptId && <StatusBanner title="Receipt connected">Only receipt {state.draft.receiptId} is attached as provenance. No receipt text was copied.</StatusBanner>}
              <InputField
                id="carry-task"
                label="ONE CONCRETE TASK"
                hint="Use a verb and a finish line. Example: prepare and submit my insurance denial appeal."
                error={state.error}
                value={state.draft.task}
                onChange={(value) => dispatch({ type: 'UPDATE_TASK', value })}
                maxLength={TASK_PLAN_LIMITS.task}
                placeholder="Prepare and submit…"
              />
              <button
                type="button"
                className="cf-inline-action"
                onClick={() => {
                  dispatch({ type: 'UPDATE_TASK', value: INSURANCE_DENIAL_TASK })
                  dispatch({ type: 'UPDATE_SOURCE', value: INSURANCE_DENIAL_SOURCE })
                }}
              >
                LOAD INSURANCE DENIAL DEMO
              </button>
              <details className="cf-demo-controls">
                <summary>VIEW RECOVERY DEMOS</summary>
                <div>
                  <button type="button" onClick={() => dispatch({ type: 'LOAD_AMBIGUOUS_DEMO' })}>AMBIGUOUS TASK</button>
                  <button type="button" onClick={() => dispatch({
                    type: 'OPEN_DEMO_FALLBACK',
                    budget: createInteractionBudget({ policies: DEFAULT_INTERACTION_POLICIES, receiptId: state.draft.receiptId }),
                  })}>COMPILER FAILURE</button>
                  <button type="button" onClick={() => dispatch({ type: 'EXPIRE' })}>EXPIRED SESSION</button>
                </div>
              </details>
              <div className="cf-form-actions">
                <a href="/" className="cf-text-link">BACK TO RECEIPT</a>
                <ActionButton disabled={state.draft.task.trim().length < 3} onClick={() => {
                  if (!hasConcreteTask(state.draft.task)) dispatch({ type: 'TASK_AMBIGUOUS' })
                  else dispatch({ type: 'NEXT_INPUT' })
                }}>CONTINUE</ActionButton>
              </div>
            </>
          )}

          {state.kind === 'input' && state.screen === 'source' && (
            <>
              <span className="cf-eyebrow">02 · ADD THE SOURCE</span>
              <h1 ref={headingRef} tabIndex={-1}>Paste the facts you have.</h1>
              <StatusBanner title="Source boundary">
                The source is sent once to the server compiler with API storage disabled. This app never writes raw source text to browser storage.
              </StatusBanner>
              <details className="cf-data-details">
                <summary>DATA DETAILS</summary>
                <p>Assisted planning sends the task and any source you provide to OpenAI only after you compile. OpenAI API data controls may retain content temporarily for abuse monitoring unless additional retention controls are enabled. Nothing is added to receipt history, FIELD records, or analytics.</p>
              </details>
              <InputField
                id="carry-source"
                label="SOURCE TEXT · OPTIONAL"
                hint="Paste a notice, email, letter, or notes—or continue without one. Remove details the task does not need."
                value={state.draft.source}
                onChange={(value) => dispatch({ type: 'UPDATE_SOURCE', value })}
                multiline
                maxLength={TASK_PLAN_LIMITS.source}
                placeholder="Paste the exact source text here…"
              />
              <div className="cf-form-actions">
                <ActionButton variant="quiet" onClick={() => dispatch({ type: 'BACK_INPUT' })}>BACK</ActionButton>
                <ActionButton onClick={() => dispatch({ type: 'OPEN_BUDGET' })}>SET INTERACTION BUDGET</ActionButton>
              </div>
            </>
          )}

          {state.kind === 'budget' && (
            <>
              <span className="cf-eyebrow">03 · DECLARE THE BUDGET</span>
              <h1 ref={headingRef} tabIndex={-1}>Choose how the plan should behave.</h1>
              <p className="cf-lede">These four policies are independent. The compiler receives exactly what you confirm.</p>
              <div className="cf-policy-grid">
                {(Object.keys(state.policies) as Array<keyof InteractionPolicies>).map((policy) => (
                  <InteractionPolicyCard key={policy} policy={policy} selected={state.policies[policy]} onToggle={() => dispatch({ type: 'TOGGLE_POLICY', policy })} />
                ))}
              </div>
              <div className="cf-form-actions">
                <ActionButton variant="quiet" onClick={() => dispatch({ type: 'BACK_TO_SOURCE' })}>BACK</ActionButton>
                <ActionButton onClick={() => {
                  const confirmed = createInteractionBudget({ policies: state.policies, receiptId: state.draft.receiptId })
                  emitCarryForwardTelemetry('carry_forward_budget_confirmed', { state: 'budget', ...telemetryPolicies(state.policies) })
                  dispatch({ type: 'PREVIEW', budget: confirmed })
                }}>CONFIRM BUDGET</ActionButton>
              </div>
            </>
          )}

          {state.kind === 'preview' && (
            <>
              <span className="cf-eyebrow">04 · PREVIEW</span>
              <h1 ref={headingRef} tabIndex={-1}>Ready to compile one plan.</h1>
              <dl className="cf-preview-list">
                <div><dt>TASK</dt><dd>{state.draft.task}</dd></div>
                <div><dt>SOURCE</dt><dd>{state.draft.source.length > 0 ? `${state.draft.source.length} characters · not stored by this app` : 'No source provided · extracted facts will be omitted'}</dd></div>
                <div><dt>PLAN LIMIT</dt><dd>1–5 required steps · 5 known step kinds</dd></div>
                <div><dt>EXPIRES</dt><dd>{new Date(state.budget.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</dd></div>
              </dl>
              <div className="cf-policy-summary">
                {(Object.keys(state.budget.policies) as Array<keyof InteractionPolicies>).map((policy) => (
                  <span key={policy} data-on={state.budget.policies[policy] || undefined}>{POLICY_COPY[policy].title} · {state.budget.policies[policy] ? 'ON' : 'OFF'}</span>
                ))}
              </div>
              <StatusBanner title="Nothing runs automatically">Compile sends one bounded request. No links, tools, external actions, or generated UI are allowed.</StatusBanner>
              <div className="cf-form-actions">
                <ActionButton variant="quiet" onClick={() => dispatch({ type: 'EDIT_BUDGET' })}>EDIT BUDGET</ActionButton>
                <ActionButton onClick={startCompile}>COMPILE TASK PLAN</ActionButton>
              </div>
            </>
          )}

          {state.kind === 'compiling' && (
            <div className="cf-compile" aria-live="polite">
              <span className="cf-eyebrow">05 · BOUNDED COMPILER</span>
              <h1 ref={headingRef} tabIndex={-1}>Building the smallest useful plan.</h1>
              <div className="cf-compile-mark" aria-hidden="true"><span /><span /><span /></div>
              <ol>
                {COMPILE_PHASES.map((phase) => {
                  const activeIndex = COMPILE_PHASES.findIndex((item) => item.id === state.phase)
                  const index = COMPILE_PHASES.findIndex((item) => item.id === phase.id)
                  return <li key={phase.id} data-active={index === activeIndex || undefined} data-complete={index < activeIndex || undefined}>{phase.label}</li>
                })}
              </ol>
              <p>Raw model output is never rendered. Only a strict plan with verified evidence can continue.</p>
            </div>
          )}

          {state.kind === 'fallback' && (
            <>
              <span className="cf-eyebrow">SAFE FALLBACK</span>
              <h1 ref={headingRef} tabIndex={-1}>{FALLBACK_COPY[state.reason].title}</h1>
              <StatusBanner tone="warning" title="Nothing partial was used">{FALLBACK_COPY[state.reason].body}</StatusBanner>
              <fieldset className="cf-manual-list">
                <legend>MAKE A MANUAL 1–5 STEP PLAN</legend>
                {state.manualItems.map((item, index) => (
                  <div key={index}>
                    <label htmlFor={`manual-${index}`}>{String(index + 1).padStart(2, '0')}</label>
                    <input id={`manual-${index}`} value={item} maxLength={160} onChange={(event) => dispatch({ type: 'UPDATE_MANUAL_ITEM', index, value: event.target.value })} />
                    {state.manualItems.length > 1 && <button type="button" aria-label={`Remove manual step ${index + 1}`} onClick={() => dispatch({ type: 'REMOVE_MANUAL_ITEM', index })}>×</button>}
                  </div>
                ))}
                {state.manualItems.length < 5 && <button type="button" className="cf-inline-action" onClick={() => dispatch({ type: 'ADD_MANUAL_ITEM' })}>+ ADD STEP</button>}
              </fieldset>
              <div className="cf-compose cf-manual-draft">
                <label htmlFor="manual-draft">WORKING DRAFT · OPTIONAL</label>
                <textarea
                  id="manual-draft"
                  rows={8}
                  maxLength={TASK_PLAN_LIMITS.composeDraft}
                  value={state.manualDraft}
                  onChange={(event) => dispatch({ type: 'UPDATE_MANUAL_DRAFT', value: event.target.value })}
                  placeholder="Keep a note or draft here while you work…"
                />
              </div>
              <div className="cf-form-actions cf-form-actions--wrap">
                <ActionButton variant="quiet" onClick={() => {
                  clearCarryForwardSession(window.localStorage)
                  dispatch({ type: 'EDIT_AFTER_FAILURE' })
                }}>EDIT SOURCE</ActionButton>
                <ActionButton variant="secondary" onClick={() => {
                  const steps = state.manualItems.filter((item) => item.trim()).map((item, index) => `${index + 1}. ${item.trim()}`).join('\n')
                  const text = `${state.draft.task}\n\n${steps}${state.manualDraft.trim() ? `\n\nDRAFT\n${state.manualDraft.trim()}` : ''}`
                  void navigator.clipboard.writeText(text)
                    .then(() => {
                      trackOutput('copy', 'success', true)
                      setOutputMessage('MANUAL WORK COPIED')
                    })
                    .catch(() => {
                      trackOutput('copy', 'failure', true)
                      setOutputMessage('COPY FAILED · DOWNLOAD IS STILL AVAILABLE')
                    })
                }} disabled={!state.manualItems.some((item) => item.trim()) && !state.manualDraft.trim()}>COPY MANUAL WORK</ActionButton>
                <ActionButton variant="secondary" onClick={() => {
                  const steps = state.manualItems.filter((item) => item.trim()).map((item, index) => `${index + 1}. ${item.trim()}`).join('\n')
                  const text = `${state.draft.task}\n\n${steps}${state.manualDraft.trim() ? `\n\nDRAFT\n${state.manualDraft.trim()}` : ''}`
                  try {
                    const href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
                    const anchor = document.createElement('a')
                    anchor.href = href
                    anchor.download = 'manual-carry-forward.txt'
                    anchor.click()
                    URL.revokeObjectURL(href)
                    trackOutput('download', 'success', true)
                    setOutputMessage('MANUAL WORK DOWNLOADED')
                  } catch {
                    trackOutput('download', 'failure', true)
                    setOutputMessage('DOWNLOAD FAILED · COPY IS STILL AVAILABLE')
                  }
                }} disabled={!state.manualItems.some((item) => item.trim()) && !state.manualDraft.trim()}>DOWNLOAD</ActionButton>
                <ActionButton onClick={() => {
                  compileStartedAtRef.current = performance.now()
                  emitCarryForwardTelemetry('carry_forward_compile_started', { state: 'compiling' })
                  dispatch({ type: 'RETRY_COMPILE' })
                }} disabled={!state.budget}>RETRY COMPILER</ActionButton>
              </div>
              <p className="cf-output-message" role="status">{outputMessage}</p>
            </>
          )}

          {state.kind === 'expired' && (
            <>
              <span className="cf-eyebrow">SESSION EXPIRED</span>
              <h1 ref={headingRef} tabIndex={-1}>This four-hour task window is closed.</h1>
              <StatusBanner title="Progress was cleared">The isolated Carry Forward record was removed. Your receipt machine data was not touched.</StatusBanner>
              <div className="cf-form-actions">
                <a href="/" className="cf-text-link">RETURN TO RECEIPT</a>
                <ActionButton onClick={reset}>START FRESH</ActionButton>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

function CompleteScreen({
  state,
  dispatch,
  headingRef,
  outputMessage,
  setOutputMessage,
  onReset,
  onOutput,
}: {
  state: Extract<CarryForwardState, { kind: 'complete' }>
  dispatch: React.Dispatch<CarryForwardEvent>
  headingRef: React.Ref<HTMLHeadingElement>
  outputMessage: string
  setOutputMessage: (message: string) => void
  onReset: () => void
  onOutput: (outputKind: 'copy' | 'download', outcome: 'success' | 'failure', manual: boolean) => void
}) {
  const { plan } = state.session
  return (
    <main className="cf-complete">
      <header className="cf-complete__head">
        <a href="/" className="cf-wordmark">bad day<br />receipt</a>
        <span>PLAN COMPLETE · M12</span>
      </header>
      <article className="cf-completion-slip">
        <span className="cf-eyebrow">ONE THING CLOSED · CARRY FORWARD COMPLETE</span>
        <h1 ref={headingRef} tabIndex={-1}>{plan.title}</h1>
        <p>{plan.summary}</p>
        <StatusBanner tone="success" title="Nothing was sent automatically">
          Temporary task context expires at {new Date(state.budget.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} unless you clear it now.
        </StatusBanner>
        <ol>{plan.steps.map((step) => <li key={step.id}><span>✓</span><strong>{step.title}</strong></li>)}</ol>
        {plan.later.length > 0 && (
          <section className="cf-later">
            <span className="cf-eyebrow">LATER · OPTIONAL WORK KEPT WHOLE</span>
            {plan.later.map((item) => <article key={item.id}><h2>{item.title}</h2><p>{item.body}</p></article>)}
          </section>
        )}
        <footer>
          <ActionButton variant="quiet" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'why' })}>WHY THIS VIEW</ActionButton>
          <ActionButton variant="quiet" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'plan' })}>SHOW COMPLETE PLAN</ActionButton>
          <ActionButton variant="secondary" onClick={() => {
            void copyPlanOutput(plan, state.session).then(() => {
              onOutput('copy', 'success', false)
              setOutputMessage('PLAN COPIED')
            }).catch(() => {
              onOutput('copy', 'failure', false)
              setOutputMessage('COPY FAILED · DOWNLOAD IS STILL AVAILABLE')
            })
          }}>COPY PLAN</ActionButton>
          <ActionButton onClick={() => {
            try {
              downloadPlanOutput(plan, state.session)
              onOutput('download', 'success', false)
              setOutputMessage('PLAN DOWNLOADED')
            } catch {
              onOutput('download', 'failure', false)
              setOutputMessage('DOWNLOAD FAILED · COPY IS STILL AVAILABLE')
            }
          }}>DOWNLOAD PLAN</ActionButton>
        </footer>
        <p className="cf-output-message" role="status">{outputMessage}</p>
      </article>
      <div className="cf-complete-exits">
        <a href="/">RETURN TO RECEIPT</a>
        <button type="button" onClick={onReset}>CLEAR TASK DATA</button>
        <button type="button" onClick={onReset}>START ANOTHER TASK</button>
      </div>
    </main>
  )
}
