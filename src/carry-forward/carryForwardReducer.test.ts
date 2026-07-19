import { describe, expect, it } from 'vitest'
import { createInsuranceDenialPlan } from './fixtures'
import { createInteractionBudget, DEFAULT_INTERACTION_POLICIES } from './interactionBudget'
import { carryForwardReducer, createInitialCarryForwardState } from './carryForwardReducer'

describe('carryForwardReducer', () => {
  it('keeps the four policy controls independent', () => {
    let state = createInitialCarryForwardState()
    state = carryForwardReducer(state, { type: 'OPEN_BUDGET' })
    expect(state.kind).toBe('budget')
    state = carryForwardReducer(state, { type: 'TOGGLE_POLICY', policy: 'fewerDecisions' })
    if (state.kind !== 'budget') throw new Error('Expected budget')
    expect(state.policies).toEqual({ ...DEFAULT_INTERACTION_POLICIES, fewerDecisions: false })
  })

  it('discards raw source when a validated plan becomes active', () => {
    let state = createInitialCarryForwardState({ receiptId: 'receipt-42' })
    state = carryForwardReducer(state, { type: 'UPDATE_TASK', value: 'Prepare and submit my appeal' })
    state = carryForwardReducer(state, { type: 'UPDATE_SOURCE', value: 'private source text' })
    state = carryForwardReducer(state, { type: 'OPEN_BUDGET' })
    if (state.kind !== 'budget') throw new Error('Expected budget')
    const budget = createInteractionBudget({ policies: state.policies, receiptId: state.draft.receiptId })
    state = carryForwardReducer(state, { type: 'PREVIEW', budget })
    state = carryForwardReducer(state, { type: 'START_COMPILE' })
    state = carryForwardReducer(state, {
      type: 'COMPILE_SUCCESS',
      plan: createInsuranceDenialPlan(),
      startedAt: '2026-07-18T12:00:00.000Z',
    })
    expect(state.kind).toBe('active')
    expect('draft' in state).toBe(false)
    expect(JSON.stringify(state)).not.toContain('private source text')
  })

  it('advances only after a step commit and completes after the last step', () => {
    const plan = createInsuranceDenialPlan()
    const budget = createInteractionBudget({ policies: DEFAULT_INTERACTION_POLICIES, receiptId: null })
    let state = carryForwardReducer(createInitialCarryForwardState(), {
      type: 'RESTORE_SESSION',
      status: 'active',
      task: 'Prepare appeal',
      budget,
      session: {
        plan,
        stepIndex: 0,
        completedStepIds: [],
        choices: {},
        checkedItems: {},
        composeDrafts: {},
        expandedChoices: {},
        startedAt: '2026-07-18T12:00:00.000Z',
      },
    })
    state = carryForwardReducer(state, { type: 'COMPLETE_STEP' })
    expect(state.kind === 'active' && state.session.stepIndex).toBe(1)

    for (let index = 1; index < plan.steps.length; index += 1) {
      state = carryForwardReducer(state, { type: 'COMPLETE_STEP' })
    }
    expect(state.kind).toBe('complete')
  })
})
