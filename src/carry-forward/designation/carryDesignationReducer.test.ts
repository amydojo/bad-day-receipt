import { describe, expect, it } from 'vitest'
import {
  createInteractionBudget,
  DEFAULT_INTERACTION_POLICIES,
  InteractionBudgetSchema,
} from '../interactionBudget'
import {
  carryDesignationReducer,
  createInitialCarryDesignationState,
} from './carryDesignationReducer'
import type {
  CarryDesignationEvent,
  CarryDesignationState,
  RemainingObligation,
} from './carryDesignationTypes'
import {
  confirmObligation,
  createManualObligation,
  createRemainingObligation,
} from './obligationProvenance'

function reduce(state: CarryDesignationState, event: CarryDesignationEvent) {
  return carryDesignationReducer(state, event)
}

const suggestion = createRemainingObligation({
  text: 'Reply to the insurance denial',
  source: 'explicit-current-input',
}) as RemainingObligation

describe('carryDesignationReducer', () => {
  it('starts direct entry with manual input and receipt origin with validated explicit input only', () => {
    expect(createInitialCarryDesignationState({ kind: 'direct' })).toEqual({
      kind: 'editing',
      draft: '',
      error: null,
    })
    expect(createInitialCarryDesignationState({
      kind: 'receipt',
      receiptId: 'BD-84',
      explicitInputs: { explicitCurrentInputs: [suggestion.text] },
    })).toEqual({ kind: 'choosing', suggestion, alternatives: [] })
    expect(createInitialCarryDesignationState({
      kind: 'receipt',
      receiptId: 'BD-84',
    })).toEqual({ kind: 'editing', draft: '', error: null })
  })

  it('does not accept an unconfirmed suggestion', () => {
    const state = createInitialCarryDesignationState({
      kind: 'receipt',
      receiptId: 'BD-84',
      explicitInputs: { explicitCurrentInputs: [suggestion.text] },
    })
    expect(reduce(state, { type: 'SELECT_SUGGESTION', obligation: suggestion })).toBe(state)
    expect(suggestion.confirmedByUser).toBe(false)
  })

  it('accepts explicit user confirmation and keeps source optional', () => {
    const state = createInitialCarryDesignationState({
      kind: 'receipt',
      receiptId: 'BD-84',
      explicitInputs: { explicitCurrentInputs: [suggestion.text] },
    })
    const confirmed = confirmObligation(suggestion)
    const source = reduce(state, { type: 'SELECT_SUGGESTION', obligation: confirmed })
    expect(source).toEqual({
      kind: 'source',
      obligation: confirmed,
      sourceText: '',
      sourceExpanded: false,
    })
    const expanded = reduce(source, { type: 'EXPAND_SOURCE' })
    const withSource = reduce(expanded, { type: 'UPDATE_SOURCE', value: 'Exact source text' })
    const collapsed = reduce(withSource, { type: 'COLLAPSE_SOURCE' })
    expect(collapsed).toMatchObject({ sourceExpanded: false, sourceText: 'Exact source text' })
  })

  it('validates manual confirmation and preserves concise error state', () => {
    let state: CarryDesignationState = { kind: 'editing', draft: 'situation', error: null }
    state = reduce(state, { type: 'MANUAL_INVALID', message: 'Name one concrete action.' })
    expect(state).toEqual({ kind: 'editing', draft: 'situation', error: 'Name one concrete action.' })
    state = reduce(state, { type: 'UPDATE_DRAFT', value: 'Reply to the landlord' })
    const manual = createManualObligation('Reply to the landlord')
    if (!manual) throw new Error('MANUAL_NOT_CREATED')
    state = reduce(state, { type: 'CONFIRM_MANUAL', obligation: confirmObligation(manual) })
    expect(state.kind).toBe('source')
  })

  it('uses the existing default policies and creates the existing typed budget', () => {
    const obligation = confirmObligation(suggestion)
    let state: CarryDesignationState = {
      kind: 'source',
      obligation,
      sourceText: '',
      sourceExpanded: false,
    }
    state = reduce(state, { type: 'CONTINUE_TO_PRESET' })
    expect(state).toEqual({
      kind: 'preset',
      obligation,
      sourceText: '',
      policies: DEFAULT_INTERACTION_POLICIES,
    })
    if (state.kind !== 'preset') throw new Error('PRESET_NOT_CREATED')
    const budget = createInteractionBudget({
      policies: state.policies,
      receiptId: 'BD-84',
      now: new Date('2026-07-20T12:00:00.000Z'),
    })
    expect(InteractionBudgetSchema.safeParse(budget).success).toBe(true)
    state = reduce(state, { type: 'ISSUE_ADJUSTMENT', budget, origin: 'receipt' })
    expect(state).toMatchObject({
      kind: 'ritual-ready',
      origin: 'receipt',
      obligation,
      sourceText: '',
    })
    state = reduce(state, { type: 'RETURN_TO_PRESET' })
    expect(state).toEqual({
      kind: 'preset',
      obligation,
      sourceText: '',
      policies: DEFAULT_INTERACTION_POLICIES,
    })
  })

  it('customizes the same policy object and produces a valid existing budget', () => {
    const obligation = confirmObligation(suggestion)
    let state: CarryDesignationState = {
      kind: 'preset',
      obligation,
      sourceText: '',
      policies: { ...DEFAULT_INTERACTION_POLICIES },
    }
    state = reduce(state, { type: 'OPEN_CUSTOMIZE' })
    state = reduce(state, { type: 'TOGGLE_POLICY', policy: 'fewerDecisions' })
    expect(state).toMatchObject({ kind: 'customizing', policies: { fewerDecisions: false } })
    state = reduce(state, { type: 'CLOSE_CUSTOMIZE' })
    expect(state.kind).toBe('preset')
    if (state.kind !== 'preset') throw new Error('CUSTOM_PRESET_NOT_RESTORED')
    expect(InteractionBudgetSchema.safeParse(createInteractionBudget({
      policies: state.policies,
      receiptId: null,
      now: new Date('2026-07-20T12:00:00.000Z'),
    })).success).toBe(true)
  })

  it('resets designation-only data without needing receipt or compiler state', () => {
    const current: CarryDesignationState = {
      kind: 'source',
      obligation: confirmObligation(suggestion),
      sourceText: 'Sensitive source',
      sourceExpanded: true,
    }
    const initial = createInitialCarryDesignationState({ kind: 'receipt', receiptId: 'BD-84' })
    expect(reduce(current, { type: 'RESET', state: initial })).toEqual(initial)
  })
})
