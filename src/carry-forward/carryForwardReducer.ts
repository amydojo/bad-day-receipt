import {
  DEFAULT_INTERACTION_POLICIES,
  type InteractionBudget,
  type InteractionPolicies,
} from './interactionBudget'
import type { ValidatedTaskPlan } from './taskPlanSchema'

export type CarryForwardDraft = {
  task: string
  source: string
  receiptId: string | null
}

export type RuntimeSession = {
  plan: ValidatedTaskPlan
  stepIndex: number
  completedStepIds: string[]
  choices: Record<string, string>
  checkedItems: Record<string, boolean>
  composeDrafts: Record<string, string>
  expandedChoices: Record<string, boolean>
  startedAt: string
}

export type CompilePhase = 'request-accepted' | 'awaiting-plan' | 'validating-plan'
export type FallbackReason = 'offline' | 'timeout' | 'rate_limited' | 'refusal' | 'invalid_plan' | 'server_error'

export type AdjustmentResume = {
  task: string
  budget: InteractionBudget
  session: RuntimeSession
}

export type CarryForwardState =
  | { kind: 'input'; screen: 'bridge' | 'task' | 'source' | 'recovery'; draft: CarryForwardDraft; error: string | null }
  | { kind: 'budget'; draft: CarryForwardDraft; policies: InteractionPolicies; resume?: AdjustmentResume }
  | { kind: 'preview'; draft: CarryForwardDraft; budget: InteractionBudget; resume?: AdjustmentResume }
  | { kind: 'compiling'; draft: CarryForwardDraft; budget: InteractionBudget; phase: CompilePhase; resume?: AdjustmentResume }
  | { kind: 'active'; task: string; budget: InteractionBudget; session: RuntimeSession }
  | { kind: 'explaining'; task: string; budget: InteractionBudget; session: RuntimeSession; returnTo: 'active' | 'complete'; inspector: 'plan' | 'why' }
  | { kind: 'complete'; task: string; budget: InteractionBudget; session: RuntimeSession }
  | { kind: 'fallback'; draft: CarryForwardDraft; budget: InteractionBudget | null; reason: FallbackReason; manualItems: string[]; manualDraft: string }
  | { kind: 'expired'; receiptId: string | null }

export function createCompiledRuntimeSession(
  plan: ValidatedTaskPlan,
  startedAt: string,
  resume?: AdjustmentResume,
): RuntimeSession {
  if (!resume) {
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

  const prior = resume.session
  const stepIds = new Set(plan.steps.map((step) => step.id))
  const completedStepIds = prior.completedStepIds.filter((id) => stepIds.has(id))
  const choices: Record<string, string> = {}
  const checkedItems: Record<string, boolean> = {}
  const composeDrafts: Record<string, string> = {}
  const expandedChoices: Record<string, boolean> = {}

  for (const step of plan.steps) {
    if (step.kind === 'choice') {
      const selected = prior.choices[step.id]
      if (selected && step.options.some((option) => option.id === selected)) choices[step.id] = selected
      if (prior.expandedChoices[step.id]) expandedChoices[step.id] = true
    }
    if (step.kind === 'checklist') {
      for (const item of step.items) {
        if (prior.checkedItems[item.id] !== undefined) checkedItems[item.id] = prior.checkedItems[item.id]
      }
    }
    if (step.kind === 'compose' && prior.composeDrafts[step.id] !== undefined) {
      composeDrafts[step.id] = prior.composeDrafts[step.id]
    }
  }

  const priorCurrentId = prior.plan.steps[prior.stepIndex]?.id
  const matchingIndex = priorCurrentId ? plan.steps.findIndex((step) => step.id === priorCurrentId) : -1
  const firstIncomplete = plan.steps.findIndex((step) => !completedStepIds.includes(step.id))

  return {
    plan,
    stepIndex: matchingIndex >= 0 ? matchingIndex : Math.max(0, firstIncomplete),
    completedStepIds,
    choices,
    checkedItems,
    composeDrafts,
    expandedChoices,
    startedAt: prior.startedAt,
  }
}

export type CarryForwardEvent =
  | { type: 'APPLY_RECEIPT_SEED'; receiptId: string }
  | { type: 'CONTINUE_FROM_RECEIPT' }
  | { type: 'UPDATE_TASK'; value: string }
  | { type: 'UPDATE_SOURCE'; value: string }
  | { type: 'NEXT_INPUT' }
  | { type: 'BACK_INPUT' }
  | { type: 'TASK_AMBIGUOUS' }
  | { type: 'TRY_AGAIN' }
  | { type: 'LOAD_AMBIGUOUS_DEMO' }
  | { type: 'OPEN_BUDGET' }
  | { type: 'TOGGLE_POLICY'; policy: keyof InteractionPolicies }
  | { type: 'BACK_TO_SOURCE' }
  | { type: 'PREVIEW'; budget: InteractionBudget }
  | { type: 'EDIT_BUDGET' }
  | { type: 'START_COMPILE' }
  | { type: 'CANCEL_COMPILE' }
  | { type: 'RESTORE_ACTIVE_FROM_ADJUSTMENT' }
  | { type: 'ADJUST_ACTIVE_BUDGET' }
  | { type: 'COMPILE_PHASE'; phase: CompilePhase }
  | { type: 'COMPILE_SUCCESS'; plan: ValidatedTaskPlan; startedAt: string }
  | { type: 'COMPILE_FAILURE'; reason: FallbackReason }
  | { type: 'RESTORE_SESSION'; status: 'active' | 'complete'; task: string; budget: InteractionBudget; session: RuntimeSession }
  | { type: 'RESTORE_FALLBACK'; draft: CarryForwardDraft; budget: InteractionBudget; reason: FallbackReason; manualItems: string[]; manualDraft: string }
  | { type: 'SELECT_CHOICE'; stepId: string; optionId: string }
  | { type: 'TOGGLE_CHECK'; itemId: string }
  | { type: 'UPDATE_COMPOSE'; stepId: string; value: string }
  | { type: 'SHOW_ALL_CHOICES'; stepId: string }
  | { type: 'COMPLETE_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'OPEN_INSPECTOR'; inspector: 'plan' | 'why' }
  | { type: 'CLOSE_WHY' }
  | { type: 'ADD_MANUAL_ITEM' }
  | { type: 'UPDATE_MANUAL_ITEM'; index: number; value: string }
  | { type: 'UPDATE_MANUAL_DRAFT'; value: string }
  | { type: 'REMOVE_MANUAL_ITEM'; index: number }
  | { type: 'RETRY_COMPILE' }
  | { type: 'EDIT_AFTER_FAILURE' }
  | { type: 'OPEN_DEMO_FALLBACK'; budget: InteractionBudget }
  | { type: 'EXPIRE' }
  | { type: 'RESET' }

export function createInitialCarryForwardState(
  seed: Partial<Pick<CarryForwardDraft, 'receiptId'>> = {},
): CarryForwardState {
  return {
    kind: 'input',
    screen: seed.receiptId ? 'bridge' : 'task',
    draft: { task: '', source: '', receiptId: seed.receiptId ?? null },
    error: null,
  }
}

function updateActiveSession(
  state: Extract<CarryForwardState, { kind: 'active' }>,
  session: RuntimeSession,
): CarryForwardState {
  return { ...state, session }
}

function restoreAdjustment(resume: AdjustmentResume | undefined): CarryForwardState | null {
  return resume ? { kind: 'active', ...resume } : null
}

export function carryForwardReducer(state: CarryForwardState, event: CarryForwardEvent): CarryForwardState {
  switch (event.type) {
    case 'APPLY_RECEIPT_SEED':
      return state.kind === 'input'
        ? { ...state, screen: 'bridge', draft: { ...state.draft, receiptId: event.receiptId }, error: null }
        : state
    case 'CONTINUE_FROM_RECEIPT':
      return state.kind === 'input' && state.screen === 'bridge' ? { ...state, screen: 'task', error: null } : state
    case 'UPDATE_TASK':
      return state.kind === 'input' ? { ...state, draft: { ...state.draft, task: event.value }, error: null } : state
    case 'UPDATE_SOURCE':
      return state.kind === 'input' ? { ...state, draft: { ...state.draft, source: event.value }, error: null } : state
    case 'NEXT_INPUT':
      return state.kind === 'input' && state.screen === 'task' ? { ...state, screen: 'source', error: null } : state
    case 'BACK_INPUT':
      return state.kind === 'input' && state.screen === 'source' ? { ...state, screen: 'task', error: null } : state
    case 'TASK_AMBIGUOUS':
      return state.kind === 'input' ? { ...state, screen: 'recovery', error: null } : state
    case 'TRY_AGAIN':
      return state.kind === 'input' && state.screen === 'recovery' ? { ...state, screen: 'task', error: null } : state
    case 'LOAD_AMBIGUOUS_DEMO':
      return state.kind === 'input'
        ? { ...state, screen: 'recovery', draft: { ...state.draft, task: 'Deal with that thing' }, error: null }
        : state
    case 'OPEN_BUDGET':
      return state.kind === 'input' ? { kind: 'budget', draft: state.draft, policies: DEFAULT_INTERACTION_POLICIES } : state
    case 'TOGGLE_POLICY':
      return state.kind === 'budget'
        ? { ...state, policies: { ...state.policies, [event.policy]: !state.policies[event.policy] } }
        : state
    case 'BACK_TO_SOURCE':
      return state.kind === 'budget'
        ? state.resume
          ? restoreAdjustment(state.resume) ?? state
          : { kind: 'input', screen: 'source', draft: state.draft, error: null }
        : state
    case 'PREVIEW':
      return state.kind === 'budget'
        ? { kind: 'preview', draft: state.draft, budget: event.budget, resume: state.resume }
        : state
    case 'EDIT_BUDGET':
      return state.kind === 'preview'
        ? { kind: 'budget', draft: state.draft, policies: state.budget.policies, resume: state.resume }
        : state
    case 'START_COMPILE':
      return state.kind === 'preview'
        ? { kind: 'compiling', draft: state.draft, budget: state.budget, phase: 'request-accepted', resume: state.resume }
        : state
    case 'CANCEL_COMPILE':
      return state.kind === 'compiling'
        ? { kind: 'preview', draft: state.draft, budget: state.budget, resume: state.resume }
        : state
    case 'RESTORE_ACTIVE_FROM_ADJUSTMENT':
      return state.kind === 'budget' || state.kind === 'preview' || state.kind === 'compiling'
        ? restoreAdjustment(state.resume) ?? state
        : state
    case 'ADJUST_ACTIVE_BUDGET': {
      if (state.kind !== 'active' && state.kind !== 'explaining') return state
      const resume: AdjustmentResume = { task: state.task, budget: state.budget, session: state.session }
      return {
        kind: 'budget',
        draft: { task: state.task, source: '', receiptId: state.budget.receiptId },
        policies: state.budget.policies,
        resume,
      }
    }
    case 'COMPILE_PHASE':
      return state.kind === 'compiling' ? { ...state, phase: event.phase } : state
    case 'COMPILE_SUCCESS':
      return state.kind === 'compiling'
        ? {
          kind: 'active',
          task: state.draft.task,
          budget: state.budget,
          session: createCompiledRuntimeSession(event.plan, event.startedAt, state.resume),
        }
        : state
    case 'COMPILE_FAILURE':
      return state.kind === 'compiling'
        ? { kind: 'fallback', draft: state.draft, budget: state.budget, reason: event.reason, manualItems: ['', '', ''], manualDraft: '' }
        : state
    case 'RESTORE_SESSION':
      return { kind: event.status, task: event.task, budget: event.budget, session: event.session }
    case 'RESTORE_FALLBACK':
      return { kind: 'fallback', draft: event.draft, budget: event.budget, reason: event.reason, manualItems: event.manualItems, manualDraft: event.manualDraft }
    case 'SELECT_CHOICE':
      return state.kind === 'active'
        ? updateActiveSession(state, { ...state.session, choices: { ...state.session.choices, [event.stepId]: event.optionId } })
        : state
    case 'TOGGLE_CHECK':
      return state.kind === 'active'
        ? updateActiveSession(state, { ...state.session, checkedItems: { ...state.session.checkedItems, [event.itemId]: !state.session.checkedItems[event.itemId] } })
        : state
    case 'UPDATE_COMPOSE':
      return state.kind === 'active'
        ? updateActiveSession(state, { ...state.session, composeDrafts: { ...state.session.composeDrafts, [event.stepId]: event.value } })
        : state
    case 'SHOW_ALL_CHOICES':
      return state.kind === 'active'
        ? updateActiveSession(state, { ...state.session, expandedChoices: { ...state.session.expandedChoices, [event.stepId]: true } })
        : state
    case 'COMPLETE_STEP': {
      if (state.kind !== 'active') return state
      const currentStep = state.session.plan.steps[state.session.stepIndex]
      if (!currentStep) return state
      const completedStepIds = state.session.completedStepIds.includes(currentStep.id)
        ? state.session.completedStepIds
        : [...state.session.completedStepIds, currentStep.id]
      const session = { ...state.session, completedStepIds }
      if (state.session.stepIndex >= state.session.plan.steps.length - 1) {
        return { kind: 'complete', task: state.task, budget: state.budget, session }
      }
      return updateActiveSession(state, { ...session, stepIndex: state.session.stepIndex + 1 })
    }
    case 'PREVIOUS_STEP':
      return state.kind === 'active' && state.session.stepIndex > 0
        ? updateActiveSession(state, { ...state.session, stepIndex: state.session.stepIndex - 1 })
        : state
    case 'OPEN_INSPECTOR':
      return state.kind === 'active' || state.kind === 'complete'
        ? { kind: 'explaining', task: state.task, budget: state.budget, session: state.session, returnTo: state.kind, inspector: event.inspector }
        : state
    case 'CLOSE_WHY':
      return state.kind === 'explaining'
        ? { kind: state.returnTo, task: state.task, budget: state.budget, session: state.session }
        : state
    case 'ADD_MANUAL_ITEM':
      return state.kind === 'fallback' && state.manualItems.length < 5 ? { ...state, manualItems: [...state.manualItems, ''] } : state
    case 'UPDATE_MANUAL_ITEM':
      return state.kind === 'fallback'
        ? { ...state, manualItems: state.manualItems.map((item, index) => index === event.index ? event.value : item) }
        : state
    case 'UPDATE_MANUAL_DRAFT':
      return state.kind === 'fallback' ? { ...state, manualDraft: event.value } : state
    case 'REMOVE_MANUAL_ITEM':
      return state.kind === 'fallback' && state.manualItems.length > 1
        ? { ...state, manualItems: state.manualItems.filter((_, index) => index !== event.index) }
        : state
    case 'RETRY_COMPILE':
      return state.kind === 'fallback' && state.budget
        ? { kind: 'compiling', draft: state.draft, budget: state.budget, phase: 'request-accepted' }
        : state
    case 'EDIT_AFTER_FAILURE':
      return state.kind === 'fallback' ? { kind: 'input', screen: 'source', draft: state.draft, error: null } : state
    case 'OPEN_DEMO_FALLBACK':
      return state.kind === 'input'
        ? { kind: 'fallback', draft: state.draft, budget: event.budget, reason: 'server_error', manualItems: ['', '', ''], manualDraft: '' }
        : state
    case 'EXPIRE': {
      const receiptId = state.kind === 'expired'
        ? state.receiptId
        : state.kind === 'input' || state.kind === 'budget' || state.kind === 'preview' || state.kind === 'compiling' || state.kind === 'fallback'
          ? state.draft.receiptId
          : state.budget.receiptId
      return { kind: 'expired', receiptId }
    }
    case 'RESET':
      return createInitialCarryForwardState()
    default:
      return state
  }
}
