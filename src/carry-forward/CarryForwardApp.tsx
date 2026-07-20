import { useEffect, useReducer, useRef, useState } from 'react'
import {
  carryForwardReducer,
  createCompiledRuntimeSession,
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
  type InteractionPolicies,
} from './interactionBudget'
import {
  ActionButton,
  InputField,
  InspectorSheet,
  InteractionPolicyCard,
  StatusBanner,
  TaskProgress,
  TaskStepShell,
} from './CarryForwardPrimitives'
import { getStepActionLabel, isStepReady, TaskStepRenderer } from './TaskStepRenderer'
import { emitCarryForwardTelemetry, type CarryForwardTelemetryProperties } from './carryForwardTelemetry'
import { TASK_PLAN_LIMITS } from './taskPlanLimits'
import { hasConcreteTask } from './taskAmbiguity'
import { getAdaptationItems, getCompletionProof, getWhyItems } from './carryForwardPresentation'
import './carry-forward-parity.css'

const RECOVERY_EXAMPLES = [
  'Reply to the landlord about the repair',
  'Finish the job application',
  'Organize the documents for the appeal',
  'Prepare questions for the clinic',
  'Update the résumé for this role',
] as const

const FALLBACK_COPY: Record<FallbackReason, { title: string; body: string }> = {
  offline: { title: 'You appear to be offline', body: 'The source stayed in this tab. You can make a manual plan or retry when connected.' },
  timeout: { title: 'The compiler took too long', body: 'No partial output was used. Your source is still available in this tab.' },
  rate_limited: { title: 'The compiler needs a moment', body: 'No partial output was used. Wait briefly or continue with a manual plan.' },
  refusal: { title: 'The compiler could not make this plan', body: 'No model text was shown. You can edit the source or make a manual plan.' },
  invalid_plan: { title: 'The plan did not pass validation', body: 'Nothing unsafe rendered. Your original task and source are still available.' },
  server_error: { title: 'The compiler is unavailable', body: 'Your source is still in this tab and has not been added to progress storage.' },
}

function getScreenCode(state: CarryForwardState) {
  if (state.kind === 'input') {
    if (state.screen === 'bridge') return 'M01'
    if (state.screen === 'task') return 'M02'
    if (state.screen === 'source') return 'M03'
    return 'M13'
  }
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

function telemetryPolicies(policies: InteractionPolicies): CarryForwardTelemetryProperties {
  return { ...policies }
}

function ProductShell({ state, children, endAction }: {
  state: CarryForwardState
  children: React.ReactNode
  endAction?: () => void
}) {
  return (
    <main className="cf-authored-shell" data-state={getScreenCode(state)}>
      <header className="cf-authored-system-bar">
        <span>{state.kind === 'compiling' ? 'ASSISTED PLANNING' : state.kind === 'active' || state.kind === 'explaining' ? 'ONE THING MODE' : 'CARRY FORWARD'}</span>
        {endAction
          ? <button type="button" onClick={endAction}>END MODE</button>
          : <span>PRIVATE · TEMPORARY</span>}
      </header>
      <section className="cf-authored-scene" key={getScreenCode(state)}>{children}</section>
    </main>
  )
}

function ReceiptBridge({ state, dispatch }: {
  state: Extract<CarryForwardState, { kind: 'input' }>
  dispatch: React.Dispatch<CarryForwardEvent>
}) {
  return (
    <>
      <div className="cf-authored-content">
        <h1 tabIndex={-1} data-screen-heading>You do not have to continue as though nothing happened.</h1>
        <article className="cf-mini-receipt" aria-label={`Connected receipt ${state.draft.receiptId}`}>
          <span>BAD DAY RECEIPT · {state.draft.receiptId}</span>
          <hr />
          <p>THIS DAY REQUIRED MORE THAN THE RECORD SHOWS.</p>
          <strong>DOCUMENT WHAT THE DAY COST.</strong>
        </article>
        <div className="cf-qualification">
          <strong>TEMPORARY SERVICE ADJUSTMENT AVAILABLE</strong>
          <p>One remaining obligation may ask less of you. Carry Forward will let you name the task before anything changes.</p>
        </div>
        <p className="cf-authored-thesis">Document what the day cost. Carry one thing forward.</p>
      </div>
      <div className="cf-authored-dock">
        <ActionButton onClick={() => dispatch({ type: 'CONTINUE_FROM_RECEIPT' })}>CARRY ONE THING FORWARD →</ActionButton>
        <ActionButton variant="quiet" onClick={() => window.location.assign('/')}>NOT NOW</ActionButton>
      </div>
    </>
  )
}

function RuntimeInspector({ state, dispatch, onEnd }: {
  state: Extract<CarryForwardState, { kind: 'explaining' }>
  dispatch: React.Dispatch<CarryForwardEvent>
  onEnd: () => void
}) {
  const returnToTask = () => dispatch({ type: 'CLOSE_WHY' })
  const title = state.inspector === 'why' ? 'Why this view?' : 'Complete plan'
  return (
    <InspectorSheet open title={title} descriptionId={state.inspector === 'why' ? 'cf-why-description' : undefined} onClose={returnToTask}>
      {state.inspector === 'why' ? (
        <div className="cf-authored-inspector">
          <span className="cf-eyebrow">TRANSPARENCY ON DEMAND</span>
          <p id="cf-why-description">These changes came from the Interaction Budget you declared. No emotional state was detected.</p>
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
            <ActionButton onClick={returnToTask}>RETURN TO TASK</ActionButton>
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
          {state.session.plan.later.length > 0 && (
            <section className="cf-later">
              <span className="cf-eyebrow">LATER · OPTIONAL WORK KEPT WHOLE</span>
              {state.session.plan.later.map((item) => <article key={item.id}><h3>{item.title}</h3><p>{item.body}</p></article>)}
            </section>
          )}
          <ActionButton onClick={returnToTask}>RETURN</ActionButton>
        </div>
      )}
    </InspectorSheet>
  )
}

function ActiveWorkspace({ state, dispatch, onEnd, onCompleteStep }: {
  state: Extract<CarryForwardState, { kind: 'active' }>
  dispatch: React.Dispatch<CarryForwardEvent>
  onEnd: () => void
  onCompleteStep: () => void
}) {
  const { plan } = state.session
  const step = plan.steps[state.session.stepIndex]
  const finalStep = state.session.stepIndex === plan.steps.length - 1
  return (
    <div className="cf-runtime cf-runtime--authored">
      <aside className="cf-task-rail" aria-label="Task plan">
        <a href="/" className="cf-wordmark">bad day<br />receipt</a>
        <div>
          <span className="cf-eyebrow">ONE THING MODE · {plan.steps.length} REQUIRED STEPS</span>
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
        <div className="cf-mobile-runtime-head"><span>ONE THING MODE</span><button type="button" onClick={onEnd}>END MODE</button></div>
        <TaskProgress steps={plan.steps} activeIndex={state.session.stepIndex} completedStepIds={state.session.completedStepIds} />
        <div className="cf-mobile-runtime-links">
          <button type="button" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'plan' })}>COMPLETE PLAN</button>
          <button type="button" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'why' })}>WHY THIS VIEW</button>
        </div>
        <TaskStepShell
          eyebrow={`STEP ${state.session.stepIndex + 1} OF ${plan.steps.length} · ${step.kind.toUpperCase()}`}
          title={step.title}
          headingRef={(node) => node?.setAttribute('data-screen-heading', '')}
          footer={(
            <div className="cf-step-actions">
              {state.session.stepIndex > 0 && <ActionButton variant="quiet" onClick={() => dispatch({ type: 'PREVIOUS_STEP' })}>BACK</ActionButton>}
              <ActionButton disabled={!isStepReady(step, state.session)} onClick={onCompleteStep}>{getStepActionLabel(step, finalStep)}</ActionButton>
            </div>
          )}
        >
          <TaskStepRenderer step={step} plan={plan} session={state.session} fewerDecisions={state.budget.policies.fewerDecisions} dispatch={dispatch} />
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

export default function CarryForwardApp() {
  const [state, dispatch] = useReducer(carryForwardReducer, undefined, () => createInitialCarryForwardState())
  const [outputMessage, setOutputMessage] = useState('')
  const compileStartedAtRef = useRef(0)
  const compileCancelRef = useRef<(() => void) | null>(null)
  const openedRef = useRef(false)
  const taskFieldRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.title = 'Carry Forward · Bad Day Receipt'
    const announceOpen = (openedState: CarryForwardTelemetryProperties['state']) => {
      if (openedRef.current) return
      openedRef.current = true
      emitCarryForwardTelemetry('carry_forward_opened', { state: openedState })
    }
    const stored = loadCarryForwardSession(window.localStorage)
    if (stored.status === 'ready') {
      if (stored.value.status === 'fallback') {
        dispatch({ type: 'RESTORE_FALLBACK', draft: stored.value.draft, budget: stored.value.budget, reason: stored.value.reason, manualItems: stored.value.manualItems, manualDraft: stored.value.manualDraft })
        announceOpen('fallback')
      } else {
        dispatch({ type: 'RESTORE_SESSION', ...stored.value })
        announceOpen(stored.value.status)
      }
    } else if (stored.status === 'expired') {
      dispatch({ type: 'EXPIRE' })
      announceOpen('expired')
    } else {
      const receiptId = consumeReceiptSeed(window.sessionStorage)
      if (receiptId) dispatch({ type: 'APPLY_RECEIPT_SEED', receiptId })
      announceOpen(receiptId ? 'bridge' : 'input')
    }
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (state.kind === 'input' && state.screen === 'task') taskFieldRef.current?.focus()
      else document.querySelector<HTMLElement>('[data-screen-heading]')?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [state.kind, state.kind === 'input' ? state.screen : '', state.kind === 'active' ? state.session.stepIndex : -1])

  useEffect(() => {
    if (state.kind === 'fallback' && state.budget) {
      saveCarryForwardFallback(window.localStorage, { status: 'fallback', draft: state.draft, budget: state.budget, reason: state.reason, manualItems: state.manualItems, manualDraft: state.manualDraft })
      return
    }
    if (state.kind !== 'active' && state.kind !== 'complete' && state.kind !== 'explaining') return
    saveCarryForwardSession(window.localStorage, {
      status: state.kind === 'complete' || (state.kind === 'explaining' && state.returnTo === 'complete') ? 'complete' : 'active',
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
        const session = createCompiledRuntimeSession(result.plan, startedAt, snapshot.resume)
        if (!saveCarryForwardSession(window.localStorage, { status: 'active', task: snapshot.draft.task, budget: snapshot.budget, session })) {
          handleFailure(new CarryForwardCompileError('server_error'))
          return
        }
        emitCarryForwardTelemetry('carry_forward_compile_succeeded', { state: 'active', stepCount: result.plan.steps.length, repaired: result.repaired, durationMs: Math.max(0, performance.now() - compileStartedAtRef.current) })
        dispatch({ type: 'COMPILE_SUCCESS', plan: result.plan, startedAt })
      },
      onFailure: handleFailure,
      onTimeout: () => handleFailure(new CarryForwardCompileError('timeout')),
    })
    compileCancelRef.current = run.cancel
    void run.promise
    return () => {
      window.cancelAnimationFrame(phaseFrame)
      if (compileCancelRef.current === run.cancel) compileCancelRef.current = null
      run.cancel()
    }
  }, [state.kind])

  const reset = () => {
    clearCarryForwardSession(window.localStorage)
    dispatch({ type: 'RESET' })
  }

  const endMode = () => {
    const activeLike = state.kind === 'active' || state.kind === 'explaining' || state.kind === 'complete'
    const compiling = state.kind === 'compiling'
    if (!activeLike && !compiling && state.kind !== 'preview' && state.kind !== 'budget') return
    if (activeLike) {
      emitCarryForwardTelemetry('carry_forward_ended', {
        state: 'active',
        stepCount: state.session.completedStepIds.length,
        durationMs: Math.max(0, Date.now() - new Date(state.session.startedAt).getTime()),
      })
    }
    if (compiling) {
      compileCancelRef.current?.()
      compileCancelRef.current = null
    }
    const receiptId = state.kind === 'budget'
      ? state.draft.receiptId
      : state.budget.receiptId
    clearCarryForwardSession(window.localStorage)
    if (receiptId) {
      window.location.replace(new URL('/', window.location.href).href)
      return
    }
    dispatch({ type: 'RESET' })
  }

  const completeStep = (activeState: Extract<CarryForwardState, { kind: 'active' }>) => {
    const step = activeState.session.plan.steps[activeState.session.stepIndex]
    if (!step || !isStepReady(step, activeState.session)) return
    emitCarryForwardTelemetry('carry_forward_step_completed', { state: 'active', stepKind: step.kind, stepIndex: activeState.session.stepIndex, stepCount: activeState.session.plan.steps.length })
    if (activeState.session.stepIndex === activeState.session.plan.steps.length - 1) {
      emitCarryForwardTelemetry('carry_forward_completed', { state: 'complete', stepCount: activeState.session.plan.steps.length, durationMs: Math.max(0, Date.now() - new Date(activeState.session.startedAt).getTime()) })
    }
    dispatch({ type: 'COMPLETE_STEP' })
  }

  if (state.kind === 'active') return <div className="cf-app" data-screen={getScreenCode(state)}><ActiveWorkspace state={state} dispatch={dispatch} onEnd={endMode} onCompleteStep={() => completeStep(state)} /></div>

  if (state.kind === 'explaining') {
    const activeState: Extract<CarryForwardState, { kind: 'active' }> = { kind: 'active', task: state.task, budget: state.budget, session: state.session }
    return (
      <div className="cf-app" data-screen="M11">
        {state.returnTo === 'active'
          ? <ActiveWorkspace state={activeState} dispatch={dispatch} onEnd={endMode} onCompleteStep={() => completeStep(activeState)} />
          : <CompletionScreen state={{ kind: 'complete', task: state.task, budget: state.budget, session: state.session }} dispatch={dispatch} outputMessage={outputMessage} setOutputMessage={setOutputMessage} onReset={reset} />}
        <RuntimeInspector state={state} dispatch={dispatch} onEnd={endMode} />
      </div>
    )
  }

  if (state.kind === 'complete') return <div className="cf-app" data-screen="M12"><CompletionScreen state={state} dispatch={dispatch} outputMessage={outputMessage} setOutputMessage={setOutputMessage} onReset={reset} /></div>

  const screen = state.kind === 'input' && state.screen === 'bridge'
    ? <ReceiptBridge state={state} dispatch={dispatch} />
    : state.kind === 'input' && state.screen === 'task'
      ? (
        <>
          <div className="cf-authored-content">
            <span className="cf-eyebrow">ONE THING MODE · 01</span>
            <h1 tabIndex={-1} data-screen-heading>What still needs doing?</h1>
            <p className="cf-authored-lede">Name an action, not the whole situation. One task is enough.</p>
            <div className="cf-task-examples"><span>EXAMPLES</span><p>Reply · choose · prepare · review</p></div>
            <div ref={(node: HTMLDivElement | null) => { taskFieldRef.current = node?.querySelector('input') ?? null }}>
              <InputField id="carry-task" label="WHAT STILL NEEDS DOING?" hint="You can change this before the plan is compiled." error={state.error} value={state.draft.task} onChange={(value) => dispatch({ type: 'UPDATE_TASK', value })} maxLength={TASK_PLAN_LIMITS.task} placeholder="Reply to…" />
            </div>
          </div>
          <div className="cf-authored-dock"><ActionButton disabled={state.draft.task.trim().length < 3} onClick={() => hasConcreteTask(state.draft.task) ? dispatch({ type: 'NEXT_INPUT' }) : dispatch({ type: 'TASK_AMBIGUOUS' })}>ADD TASK CONTEXT →</ActionButton><ActionButton variant="quiet" onClick={() => window.location.assign('/')}>CANCEL</ActionButton></div>
        </>
      )
      : state.kind === 'input' && state.screen === 'source'
        ? (
          <>
            <div className="cf-authored-content"><span className="cf-eyebrow">ONE THING MODE · 02</span><h1 tabIndex={-1} data-screen-heading>Give the task only what it needs.</h1><InputField id="carry-source" label="OPTIONAL SOURCE CONTEXT" hint="Remove account numbers or details the response does not require." value={state.draft.source} onChange={(value) => dispatch({ type: 'UPDATE_SOURCE', value })} multiline maxLength={TASK_PLAN_LIMITS.source} placeholder="Paste the exact source text here…" /><StatusBanner title="Assisted planning disclosure">This task and source text will be sent to OpenAI only after you approve the adaptation preview and begin One Thing Mode. Bad Day Receipt does not add it to receipt history, FIELD records, analytics, or exports.</StatusBanner></div>
            <div className="cf-authored-dock"><ActionButton onClick={() => dispatch({ type: 'OPEN_BUDGET' })}>DECLARE INTERACTION BUDGET →</ActionButton><ActionButton variant="secondary" onClick={() => { dispatch({ type: 'UPDATE_SOURCE', value: '' }); dispatch({ type: 'OPEN_BUDGET' }) }}>CONTINUE WITHOUT SOURCE</ActionButton><ActionButton variant="quiet" onClick={() => dispatch({ type: 'BACK_INPUT' })}>BACK</ActionButton></div>
          </>
        )
        : state.kind === 'input' && state.screen === 'recovery'
          ? (
            <>
              <div className="cf-authored-content"><span className="cf-eyebrow cf-warning">PLAN NOT COMPILED</span><h1 tabIndex={-1} data-screen-heading>The task needs one clearer action.</h1><StatusBanner tone="warning" title="Nothing was added to a plan">One concrete outcome is needed before compilation. Your original phrase is preserved.</StatusBanner><div className="cf-recovery-phrase"><span>ORIGINAL PHRASE</span><strong>{state.draft.task}</strong></div><p className="cf-authored-lede">Try one of these shapes:</p><ul className="cf-recovery-examples">{RECOVERY_EXAMPLES.map((example) => <li key={example}>{example}</li>)}</ul></div>
              <div className="cf-authored-dock"><ActionButton onClick={() => dispatch({ type: 'TRY_AGAIN' })}>TRY AGAIN →</ActionButton><ActionButton variant="quiet" onClick={() => window.location.assign('/')}>END MODE</ActionButton></div>
            </>
          )
          : state.kind === 'budget'
            ? (
              <>
                <div className="cf-authored-content"><span className="cf-eyebrow">ONE THING MODE · 03</span><h1 tabIndex={-1} data-screen-heading>What should this task ask less of?</h1><p className="cf-authored-lede">These are your requests, not conclusions about you.</p><div className="cf-policy-grid">{(Object.keys(state.policies) as Array<keyof InteractionPolicies>).map((policy) => <InteractionPolicyCard key={policy} policy={policy} selected={state.policies[policy]} onToggle={() => dispatch({ type: 'TOGGLE_POLICY', policy })} />)}</div></div>
                <div className="cf-authored-dock"><ActionButton onClick={() => { const confirmed = createInteractionBudget({ policies: state.policies, receiptId: state.draft.receiptId }); emitCarryForwardTelemetry('carry_forward_budget_confirmed', { state: 'budget', ...telemetryPolicies(state.policies) }); dispatch({ type: 'PREVIEW', budget: confirmed }) }}>PREVIEW CHANGES →</ActionButton><ActionButton variant="quiet" onClick={() => dispatch({ type: 'BACK_TO_SOURCE' })}>{state.resume ? 'RETURN TO TASK' : 'BACK'}</ActionButton></div>
              </>
            )
            : state.kind === 'preview'
              ? (
                <>
                  <div className="cf-authored-content"><span className="cf-eyebrow">BEFORE ANYTHING CHANGES</span><h1 tabIndex={-1} data-screen-heading>One Thing Mode will…</h1><ol className="cf-adaptation-list">{getAdaptationItems(state.budget.policies).map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.text}</strong></li>)}</ol><div className="cf-invariant"><strong>NOTHING WILL BE SENT AUTOMATICALLY.</strong><p>The layout changes once, after approval, then remains stable until the task ends.</p></div><details className="cf-technical-disclosure"><summary>TECHNICAL BOUNDARY</summary><p>One bounded GPT-5.6 request may be repaired once only after validation. The model has no tools and cannot create interface components.</p></details></div>
                  <div className="cf-authored-dock"><ActionButton onClick={() => { compileStartedAtRef.current = performance.now(); emitCarryForwardTelemetry('carry_forward_compile_started', { state: 'compiling' }); dispatch({ type: 'START_COMPILE' }) }}>BEGIN ONE THING MODE →</ActionButton><ActionButton variant="secondary" onClick={() => dispatch({ type: 'EDIT_BUDGET' })}>ADJUST</ActionButton>{state.resume && <ActionButton variant="secondary" onClick={() => dispatch({ type: 'RESTORE_ACTIVE_FROM_ADJUSTMENT' })}>RETURN TO TASK</ActionButton>}<ActionButton variant="quiet" onClick={endMode}>END MODE</ActionButton></div>
                </>
              )
              : state.kind === 'compiling'
                ? (
                  <>
                    <div className="cf-authored-content" aria-live="polite"><span className="cf-eyebrow">COMPILING A BOUNDED PLAN</span><h1 tabIndex={-1} data-screen-heading>Preparing the minimum necessary interface…</h1><ol className="cf-compile-stages"><li data-complete><span>01</span><strong>REQUEST ACCEPTED</strong></li><li data-active={state.phase === 'awaiting-plan' || undefined} data-complete={state.phase === 'validating-plan' || undefined}><span>02</span><strong>AWAITING A COMPLETE PLAN</strong></li><li data-active={state.phase === 'validating-plan' || undefined}><span>03</span><strong>VALIDATING BEFORE RENDER</strong></li></ol><div className="cf-invariant"><strong>NO SIDE EFFECTS</strong><p>The compiler has no tools. It cannot send, submit, purchase, delete, browse, or access an account.</p></div></div>
                    <div className="cf-authored-dock"><ActionButton variant="quiet" onClick={() => { compileCancelRef.current?.(); compileCancelRef.current = null; dispatch({ type: 'CANCEL_COMPILE' }) }}>CANCEL</ActionButton><ActionButton variant="quiet" onClick={endMode}>END MODE</ActionButton></div>
                  </>
                )
                : state.kind === 'fallback'
                  ? <FallbackScreen state={state} dispatch={dispatch} outputMessage={outputMessage} setOutputMessage={setOutputMessage} onReset={reset} />
                  : <><div className="cf-authored-content"><span className="cf-eyebrow">SESSION EXPIRED</span><h1 tabIndex={-1} data-screen-heading>This temporary task window is closed.</h1><StatusBanner title="Context cleared">The isolated Carry Forward record was removed. Receipt history was not touched.</StatusBanner></div><div className="cf-authored-dock"><ActionButton onClick={reset}>START FRESH</ActionButton><ActionButton variant="quiet" onClick={() => window.location.assign('/')}>RETURN TO RECEIPT</ActionButton></div></>

  return <div className="cf-app" data-screen={getScreenCode(state)}><ProductShell state={state} endAction={state.kind === 'compiling' ? endMode : undefined}>{screen}</ProductShell></div>
}

function FallbackScreen({ state, dispatch, outputMessage, setOutputMessage, onReset }: {
  state: Extract<CarryForwardState, { kind: 'fallback' }>
  dispatch: React.Dispatch<CarryForwardEvent>
  outputMessage: string
  setOutputMessage: (message: string) => void
  onReset: () => void
}) {
  return (
    <>
      <div className="cf-authored-content"><span className="cf-eyebrow">SAFE MANUAL FALLBACK</span><h1 tabIndex={-1} data-screen-heading>{FALLBACK_COPY[state.reason].title}</h1><StatusBanner tone="warning" title="Nothing partial was used">{FALLBACK_COPY[state.reason].body}</StatusBanner><fieldset className="cf-manual-list"><legend>MAKE A MANUAL 1–5 STEP PLAN</legend>{state.manualItems.map((item, index) => <div key={index}><label htmlFor={`manual-${index}`}>{String(index + 1).padStart(2, '0')}</label><input id={`manual-${index}`} value={item} maxLength={160} onChange={(event) => dispatch({ type: 'UPDATE_MANUAL_ITEM', index, value: event.target.value })} />{state.manualItems.length > 1 && <button type="button" aria-label={`Remove manual step ${index + 1}`} onClick={() => dispatch({ type: 'REMOVE_MANUAL_ITEM', index })}>×</button>}</div>)}{state.manualItems.length < 5 && <button type="button" className="cf-inline-action" onClick={() => dispatch({ type: 'ADD_MANUAL_ITEM' })}>+ ADD STEP</button>}</fieldset><div className="cf-compose cf-manual-draft"><label htmlFor="manual-draft">WORKING DRAFT · OPTIONAL</label><textarea id="manual-draft" rows={8} maxLength={TASK_PLAN_LIMITS.composeDraft} value={state.manualDraft} onChange={(event) => dispatch({ type: 'UPDATE_MANUAL_DRAFT', value: event.target.value })} /></div><p className="cf-output-message" role="status">{outputMessage}</p></div>
      <div className="cf-authored-dock"><ActionButton variant="quiet" onClick={() => { clearCarryForwardSession(window.localStorage); dispatch({ type: 'EDIT_AFTER_FAILURE' }) }}>EDIT SOURCE</ActionButton><ActionButton variant="secondary" disabled={!state.manualItems.some((item) => item.trim()) && !state.manualDraft.trim()} onClick={() => { const text = `${state.draft.task}\n\n${state.manualItems.filter((item) => item.trim()).map((item, index) => `${index + 1}. ${item.trim()}`).join('\n')}${state.manualDraft.trim() ? `\n\nDRAFT\n${state.manualDraft.trim()}` : ''}`; void navigator.clipboard.writeText(text).then(() => setOutputMessage('MANUAL WORK COPIED')).catch(() => setOutputMessage('COPY FAILED')) }}>COPY MANUAL WORK</ActionButton><ActionButton onClick={() => { emitCarryForwardTelemetry('carry_forward_compile_started', { state: 'compiling' }); dispatch({ type: 'RETRY_COMPILE' }) }} disabled={!state.budget}>RETRY COMPILER</ActionButton><ActionButton variant="quiet" onClick={onReset}>END MODE</ActionButton></div>
    </>
  )
}

function CompletionScreen({ state, dispatch, outputMessage, setOutputMessage, onReset }: {
  state: Extract<CarryForwardState, { kind: 'complete' }>
  dispatch: React.Dispatch<CarryForwardEvent>
  outputMessage: string
  setOutputMessage: (message: string) => void
  onReset: () => void
}) {
  const proof = getCompletionProof(state.session.plan, state.session)
  const expires = new Date(state.budget.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return (
    <main className="cf-authored-shell cf-completion" data-state="M12">
      <header className="cf-authored-system-bar"><span>CARRY FORWARD</span><span>PRIVATE · TEMPORARY</span></header>
      <section className="cf-authored-scene">
        <div className="cf-authored-content"><span className="cf-eyebrow cf-success">TRANSACTION COMPLETE</span><h1 tabIndex={-1} data-screen-heading>One thing closed.</h1><article className="cf-completion-proof"><span>{proof.taskTitle}</span><strong>PREPARED FOR REVIEW</strong><p>{proof.requiredCompleted} of {proof.requiredTotal} required steps completed<br />{proof.draftsPrepared} draft{proof.draftsPrepared === 1 ? '' : 's'} prepared<br />{proof.laterCount} Later item{proof.laterCount === 1 ? '' : 's'} preserved</p></article><StatusBanner tone="success" title="No external action is being claimed">Carry Forward prepared the in-app work. It did not send, submit, file, approve, or resolve anything outside this interface.</StatusBanner><div className="cf-temporary-context"><strong>TEMPORARY CONTEXT</strong><p>The validated plan and protected progress expire at {expires}. Clear them now or return to the receipt.</p><button type="button" onClick={onReset}>CLEAR NOW</button></div><details className="cf-completion-details"><summary>OUTPUT AND FULL DETAILS</summary><p>{state.session.plan.summary}</p><div><ActionButton variant="quiet" onClick={() => dispatch({ type: 'OPEN_INSPECTOR', inspector: 'plan' })}>SHOW COMPLETE PLAN</ActionButton><ActionButton variant="secondary" onClick={() => { void copyPlanOutput(state.session.plan, state.session).then(() => { emitCarryForwardTelemetry('carry_forward_output_completed', { outputKind: 'copy', outcome: 'success', manual: false }); setOutputMessage('PLAN COPIED') }).catch(() => { emitCarryForwardTelemetry('carry_forward_output_completed', { outputKind: 'copy', outcome: 'failure', manual: false }); setOutputMessage('COPY FAILED') }) }}>COPY PLAN</ActionButton><ActionButton variant="secondary" onClick={() => { try { downloadPlanOutput(state.session.plan, state.session); emitCarryForwardTelemetry('carry_forward_output_completed', { outputKind: 'download', outcome: 'success', manual: false }); setOutputMessage('PLAN DOWNLOADED') } catch { emitCarryForwardTelemetry('carry_forward_output_completed', { outputKind: 'download', outcome: 'failure', manual: false }); setOutputMessage('DOWNLOAD FAILED') } }}>DOWNLOAD PLAN</ActionButton></div></details><p className="cf-output-message" role="status">{outputMessage}</p></div>
        <div className="cf-authored-dock"><a className="cf-button cf-button--primary" href="/">RETURN TO RECEIPT</a><ActionButton variant="secondary" onClick={onReset}>START ANOTHER TASK</ActionButton><ActionButton variant="quiet" onClick={onReset}>CLEAR NOW</ActionButton></div>
      </section>
    </main>
  )
}
