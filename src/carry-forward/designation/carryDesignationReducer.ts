import {
  DEFAULT_INTERACTION_POLICIES,
  InteractionBudgetSchema,
} from '../interactionBudget'
import {
  getObligationChoiceModel,
  sanitizeObligationCandidates,
} from './obligationProvenance'
import type {
  CarryDesignationEvent,
  CarryDesignationOrigin,
  CarryDesignationState,
} from './carryDesignationTypes'

export function createInitialCarryDesignationState(
  origin: CarryDesignationOrigin,
): CarryDesignationState {
  if (origin.kind === 'direct') {
    return { kind: 'editing', draft: '', error: null }
  }

  const choices = getObligationChoiceModel(
    sanitizeObligationCandidates(origin.candidates),
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
    case 'choosing':
      if (event.type === 'SELECT_SUGGESTION'
        && event.obligation.confirmedByUser
        && state.suggestion?.text === event.obligation.text) {
        return {
          kind: 'source',
          obligation: event.obligation,
          sourceText: '',
          sourceExpanded: false,
        }
      }
      if (event.type === 'SELECT_SUGGESTION'
        && event.obligation.confirmedByUser
        && state.alternatives.some((candidate) => candidate.text === event.obligation.text)) {
        return {
          kind: 'source',
          obligation: event.obligation,
          sourceText: '',
          sourceExpanded: false,
        }
      }
      if (event.type === 'EDIT_SUGGESTION') {
        return { kind: 'editing', draft: event.text, error: null }
      }
      if (event.type === 'CHOOSE_SOMETHING_ELSE') {
        return { kind: 'editing', draft: '', error: null }
      }
      return state

    case 'editing':
      if (event.type === 'UPDATE_DRAFT') {
        return { ...state, draft: event.value, error: null }
      }
      if (event.type === 'MANUAL_INVALID') {
        return { ...state, error: event.message }
      }
      if (event.type === 'CONFIRM_MANUAL') {
        if (!event.obligation.confirmedByUser) {
          return { ...state, error: 'Confirm one concrete obligation before continuing.' }
        }
        return {
          kind: 'source',
          obligation: event.obligation,
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
        if (!budget.success || !state.obligation.confirmedByUser) {
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
      return state

    case 'recovery':
      if (event.type === 'EDIT_AFTER_RECOVERY') {
        return { kind: 'editing', draft: state.draft, error: null }
      }
      return state
  }
}
