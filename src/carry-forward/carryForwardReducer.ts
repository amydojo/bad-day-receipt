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

export type CarryForwardState =
  | {
    kind: 'input'
    screen: 'task' | 'source'
    draft: CarryForwardDraft
    error: string | null
  }
  | {
    kind: 'budget'
    draft: CarryForwardDraft
    policies: InteractionPolicies
  }
  | {
    kind: 'preview'
    draft: CarryForwardDraft
    budget: InteractionBudget
  }
  | {
    kind: 'compiling'
    draft: CarryForwardDraft
    budget: InteractionBudget
    phase: CompilePhase
  }
  | {
    kind: 'active'
    task: string
    budget: InteractionBudget
    session: RuntimeSession
  }
  | {
    kind: 'explaining'
    task: string
    budget: InteractionBudget
    session: RuntimeSession
    returnTo: 'active' | 'complete'
    inspector: 'plan' | 'why'
  }
  | {
    kind: 'complete'
    task: string
    budget: InteractionBudget
    session: RuntimeSession
  }
  | {
    kind: 'fallback'
    draft: CarryForwardDraft
    budget: InteractionBudget | null
    reason: FallbackReason
    manualItems: string[]
    manualDraft: string
  }
  | {
    kind: 'expired'
    receiptId: string | null
  }

export type CarryForwardEvent =
  | { type: 'APPLY_RECEIPT_SEED'; receiptId: string }
  | { type: 'UPDATE_TASK'; value: string }
  | { type: 'UPDATE_SOURCE'; value: string }
  | { type: 'NEXT_INPUT' }
  | { type: 'BACK_INPUT' }
  | { type: 'TASK_AMBIGUOUS' }
  | { type: 'LOAD_AMBIGUOUS_DEMO' }
  | { type: 'OPEN_BUDGET' }
  | { type: 'TOGGLE_POLICY'; policy: keyof InteractionPolicies }
  | { type: 'BACK_TO_SOURCE' }
  | { type: 'PREVIEW'; budget: InteractionBudget }
  | { type: 'EDIT_BUDGET' }
  | { type: 'START_COMPILE' }
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
    screen: 'task',
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

export function carryForwardReducer(
  state: CarryForwardState,
  event: CarryForwardEvent,
): CarryForwardState {
  switch (event.type) {
    case 'APPLY_RECEIPT_SEED':
      return state.kind === 'input'
        ? { ...state, draft: { ...state.draft, receiptId: event.receiptId } }
        : state
    case 'UPDATE_TASK':
      return state.kind === 'input'
        ? { ...state, draft: { ...state.draft, task: event.value }, error: null }
        : state
    case 'UPDATE_SOURCE':
      return state.kind === 'input'
        ? { ...state, draft: { ...state.draft, source: event.value }, error: null }
        : state
    case 'NEXT_INPUT':
      return state.kind === 'input' && state.screen === 'task'
        ? { ...state, screen: 'source', error: null }
        : state
    case 'BACK_INPUT':
      return state.kind === 'input' && state.screen === 'source'
        ? { ...state, screen: 'task', error: null }
        : state
    case 'TASK_AMBIGUOUS':
      return state.kind === 'input'
        ? { ...state, screen: 'task', error: 'Name the concrete thing you want to finish.' }
        : state
    case 'LOAD_AMBIGUOUS_DEMO':
      return state.kind === 'input'
        ? {
          ...state,
          screen: 'task',
          draft: { ...state.draft, task: 'Deal with that insurance thing' },
          error: 'Name the concrete thing you want to finish.',
        }
        : state
    case 'OPEN_BUDGET':
      return state.kind === 'input'
        ? { kind: 'budget', draft: state.draft, policies: DEFAULT_INTERACTION_POLICIES }
        : state
    case 'TOGGLE_POLICY':
      return state.kind === 'budget'
        ? {
          ...state,
          policies: { ...state.policies, [event.policy]: !state.policies[event.policy] },
        }
        : state
    case 'BACK_TO_SOURCE':
      return state.kind === 'budget'
        ? { kind: 'input', screen: 'source', draft: state.draft, error: null }
        : state
    case 'PREVIEW':
      return state.kind === 'budget'
        ? { kind: 'preview', draft: state.draft, budget: event.budget }
        : state
    case 'EDIT_BUDGET':
      return state.kind === 'preview'
        ? { kind: 'budget', draft: state.draft, policies: state.budget.policies }
        : state
    case 'START_COMPILE':
      return state.kind === 'preview'
        ? { kind: 'compiling', draft: state.draft, budget: state.budget, phase: 'request-accepted' }
        : state
    case 'COMPILE_PHASE':
      return state.kind === 'compiling' ? { ...state, phase: event.phase } : state
    case 'COMPILE_SUCCESS':
      return state.kind === 'compiling'
        ? {
          kind: 'active',
          task: state.draft.task,
          budget: state.budget,
          session: {
            plan: event.plan,
            stepIndex: 0,
            completedStepIds: [],
            choices: {},
            checkedItems: {},
            composeDrafts: {},
            expandedChoices: {},
            startedAt: event.startedAt,
          },
        }
        : state
    case 'COMPILE_FAILURE':
      return state.kind === 'compiling'
        ? {
          kind: 'fallback',
          draft: state.draft,
          budget: state.budget,
          reason: event.reason,
          manualItems: ['', '', ''],
          manualDraft: '',
        }
        : state
    case 'RESTORE_SESSION':
      return { kind: event.status, task: event.task, budget: event.budget, session: event.session }
    case 'RESTORE_FALLBACK':
      return {
        kind: 'fallback',
        draft: event.draft,
        budget: event.budget,
        reason: event.reason,
        manualItems: event.manualItems,
        manualDraft: event.manualDraft,
      }
    case 'SELECT_CHOICE':
      return state.kind === 'active'
        ? updateActiveSession(state, {
          ...state.session,
          choices: { ...state.session.choices, [event.stepId]: event.optionId },
        })
        : state
    case 'TOGGLE_CHECK':
      return state.kind === 'active'
        ? updateActiveSession(state, {
          ...state.session,
          checkedItems: {
            ...state.session.checkedItems,
            [event.itemId]: !state.session.checkedItems[event.itemId],
          },
        })
        : state
    case 'UPDATE_COMPOSE':
      return state.kind === 'active'
        ? updateActiveSession(state, {
          ...state.session,
          composeDrafts: { ...state.session.composeDrafts, [event.stepId]: event.value },
        })
        : state
    case 'SHOW_ALL_CHOICES':
      return state.kind === 'active'
        ? updateActiveSession(state, {
          ...state.session,
          expandedChoices: { ...state.session.expandedChoices, [event.stepId]: true },
        })
        : state
    case 'COMPLETE_STEP': {
      if (state.kind !== 'active') return state
      const current = state.session.plan.steps[state.session.stepIndex]
      if (!current) return state
      const completedStepIds = state.session.completedStepIds.includes(current.id)
        ? state.session.completedStepIds
        : [...state.session.completedStepIds, current.id]
      if (state.session.stepIndex >= state.session.plan.steps.length - 1) {
        return {
          kind: 'complete',
          task: state.task,
          budget: state.budget,
          session: { ...state.session, completedStepIds },
        }
      }
      return updateActiveSession(state, {
        ...state.session,
        completedStepIds,
        stepIndex: state.session.stepIndex + 1,
      })
    }
    case 'PREVIOUS_STEP':
      return state.kind === 'active' && state.session.stepIndex > 0
        ? updateActiveSession(state, { ...state.session, stepIndex: state.session.stepIndex - 1 })
        : state
    case 'OPEN_INSPECTOR':
      return state.kind === 'active' || state.kind === 'complete'
        ? { ...state, kind: 'explaining', returnTo: state.kind, inspector: event.inspector }
        : state
    case 'CLOSE_WHY':
      return state.kind === 'explaining'
        ? {
          kind: state.returnTo,
          task: state.task,
          budget: state.budget,
          session: state.session,
        }
        : state
    case 'ADD_MANUAL_ITEM':
      return state.kind === 'fallback' && state.manualItems.length < 5
        ? { ...state, manualItems: [...state.manualItems, ''] }
        : state
    case 'UPDATE_MANUAL_ITEM':
      return state.kind === 'fallback'
        ? {
          ...state,
          manualItems: state.manualItems.map((item, index) => index === event.index ? event.value : item),
        }
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
      return state.kind === 'fallback'
        ? { kind: 'input', screen: 'source', draft: state.draft, error: null }
        : state
    case 'OPEN_DEMO_FALLBACK':
      return state.kind === 'input'
        ? {
          kind: 'fallback',
          draft: state.draft,
          budget: event.budget,
          reason: 'server_error',
          manualItems: ['', '', ''],
          manualDraft: '',
        }
        : state
    case 'EXPIRE':
      return {
        kind: 'expired',
        receiptId: state.kind === 'input' || state.kind === 'budget' || state.kind === 'preview'
          || state.kind === 'compiling' || state.kind === 'fallback'
          ? state.draft.receiptId
          : state.kind === 'expired'
            ? state.receiptId
            : state.budget.receiptId,
      }
    case 'RESET':
      return createInitialCarryForwardState()
    default:
      return state
  }
}
