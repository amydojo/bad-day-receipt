import {
  DEFAULT_INTERACTION_POLICIES,
  InteractionBudgetSchema,
} from '../interactionBudget'
import {
  collectExplicitObligations,
  createManualObligation,
  getObligationChoiceModel,
} from './obligationProvenance'
import type {
  CarryDesignationEvent,
  CarryDesignationOrigin,
  CarryDesignationState,
  RemainingObligation,
} from './carryDesignationTypes'

export function createInitialCarryDesignationState(
  origin: CarryDesignationOrigin,
): CarryDesignationState {
  if (origin.kind === 'direct') {
    return { kind: 'editing', draft: '', error: null }
  }

  const choices = getObligationChoiceModel(
    collectExplicitObligations(origin.explicitInputs),
  )
  if (!choices.suggestion && choices.alternatives.length === 0) {
    return { kind: 'editing', draft: '', error: null }
  }
  return { kind: 'choosing', ...choices }
}

export function carryDesignationReducer(
  state: CarryDesignationState,
  event: CarryDesignationEvent,
): CarryDesignationState {
  if (event.type === 'RESET') return event.state

  switch (state.kind) {
    case 'choosing': {
      if (event.type === 'SELECT_SUGGESTION' && event.obligation.confirmedByUser) {
        const candidate = findMatchingCandidate(state, event.obligation)
        if (candidate) {
          return {
            kind: 'source',
            obligation: { ...candidate, confirmedByUser: true },
            sourceText: '',
            sourceExpanded: false,
          }
        }
      }
      if (event.type === 'EDIT_SUGGESTION') {
        return { kind: 'editing', draft: event.text, error: null }
      }
      if (event.type === 'CHOOSE_SOMETHING_ELSE') {
        return { kind: 'editing', draft: '', error: null }
      }
      return state
    }

    case 'editing':
      if (event.type === 'UPDATE_DRAFT') {
        return { ...state, draft: event.value, error: null }
      }
      if (event.type === 'MANUAL_INVALID') {
        return { ...state, error: event.message }
      }
      if (event.type === 'CONFIRM_MANUAL') {
        const expected = createManualObligation(state.draft)
        if (!event.obligation.confirmedByUser
          || event.obligation.source !== 'manual'
          || !expected
          || expected.text !== event.obligation.text) {
          return { ...state, error: 'Confirm one concrete obligation before continuing.' }
        }
        return {
          kind: 'source',
          obligation: { ...expected, confirmedByUser: true },
          sourceText: '',
          sourceExpanded: false,
        }
      }
      return state

    case 'source':
      if (event.type === 'EXPAND_SOURCE') return { ...state, sourceExpanded: true }
      if (event.type === 'COLLAPSE_SOURCE') return { ...state, sourceExpanded: false }
      if (event.type === 'UPDATE_SOURCE') return { ...state, sourceText: event.value }
      if (event.type === 'CONTINUE_TO_PRESET') {
        if (!state.obligation.confirmedByUser) return state
        return {
          kind: 'preset',
          obligation: state.obligation,
          sourceText: state.sourceText,
          policies: { ...DEFAULT_INTERACTION_POLICIES },
        }
      }
      if (event.type === 'BACK_TO_OBLIGATION') {
        return { kind: 'editing', draft: state.obligation.text, error: null }
      }
      return state

    case 'preset':
      if (event.type === 'OPEN_CUSTOMIZE') return { ...state, kind: 'customizing' }
      if (event.type === 'ISSUE_ADJUSTMENT') {
        const budget = InteractionBudgetSchema.safeParse(event.budget)
        const originMatchesBudget = budget.success && (
          (event.origin === 'direct' && budget.data.receiptId === null)
          || (event.origin === 'receipt' && budget.data.receiptId !== null)
        )
        if (!budget.success || !originMatchesBudget || !state.obligation.confirmedByUser) {
          return { kind: 'recovery', reason: 'invalid-budget', draft: state.obligation.text }
        }
        return {
          kind: 'ritual-ready',
          obligation: state.obligation,
          sourceText: state.sourceText,
          budget: budget.data,
          origin: event.origin,
        }
      }
      if (event.type === 'BACK_TO_OBLIGATION') {
        return {
          kind: 'source',
          obligation: state.obligation,
          sourceText: state.sourceText,
          sourceExpanded: state.sourceText.length > 0,
        }
      }
      return state

    case 'customizing':
      if (event.type === 'TOGGLE_POLICY') {
        return {
          ...state,
          policies: {
            ...state.policies,
            [event.policy]: !state.policies[event.policy],
          },
        }
      }
      if (event.type === 'CLOSE_CUSTOMIZE') return { ...state, kind: 'preset' }
      return state

    case 'ritual-ready':
      if (event.type === 'RETURN_TO_PRESET') {
        return {
          kind: 'preset',
          obligation: state.obligation,
          sourceText: state.sourceText,
          policies: { ...state.budget.policies },
        }
      }
      return state

    case 'recovery':
      if (event.type === 'EDIT_AFTER_RECOVERY') {
        return { kind: 'editing', draft: state.draft, error: null }
      }
      return state
  }
}

function findMatchingCandidate(
  state: Extract<CarryDesignationState, { kind: 'choosing' }>,
  obligation: RemainingObligation,
): RemainingObligation | null {
  const candidates = state.suggestion
    ? [state.suggestion]
    : state.alternatives
  return candidates.find((candidate) => (
    candidate.text === obligation.text
    && candidate.source === obligation.source
    && candidate.confirmedByUser === false
  )) ?? null
}
