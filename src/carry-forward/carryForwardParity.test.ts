import { describe, expect, it } from 'vitest'
import { createInsuranceDenialPlan } from './fixtures'
import { createInteractionBudget, DEFAULT_INTERACTION_POLICIES } from './interactionBudget'
import { carryForwardReducer, createInitialCarryForwardState } from './carryForwardReducer'
import { getAdaptationItems, getWhyItems } from './carryForwardPresentation'
import { getStepActionLabel } from './TaskStepRenderer'

describe('Carry Forward authored parity contract', () => {
  it('maps receipt provenance to M01 while direct entry remains M02', () => {
    const direct = createInitialCarryForwardState()
    expect(direct).toMatchObject({ kind: 'input', screen: 'task', draft: { receiptId: null } })
    const receipt = createInitialCarryForwardState({ receiptId: 'receipt-42' })
    expect(receipt).toMatchObject({ kind: 'input', screen: 'bridge', draft: { receiptId: 'receipt-42' } })
    expect(carryForwardReducer(receipt, { type: 'CONTINUE_FROM_RECEIPT' })).toMatchObject({ kind: 'input', screen: 'task' })
  })

  it('uses a dedicated ambiguity state and preserves the original phrase', () => {
    let state = createInitialCarryForwardState()
    state = carryForwardReducer(state, { type: 'UPDATE_TASK', value: 'Deal with that thing' })
    state = carryForwardReducer(state, { type: 'TASK_AMBIGUOUS' })
    expect(state).toMatchObject({ kind: 'input', screen: 'recovery', draft: { task: 'Deal with that thing' } })
    state = carryForwardReducer(state, { type: 'TRY_AGAIN' })
    expect(state).toMatchObject({ kind: 'input', screen: 'task', draft: { task: 'Deal with that thing' } })
  })

  it('cancels compilation back to the approved preview without creating a plan', () => {
    let state = createInitialCarryForwardState()
    state = carryForwardReducer(state, { type: 'UPDATE_TASK', value: 'Prepare the appeal' })
    state = carryForwardReducer(state, { type: 'OPEN_BUDGET' })
    if (state.kind !== 'budget') throw new Error('Expected budget')
    const budget = createInteractionBudget({ policies: state.policies, receiptId: null })
    state = carryForwardReducer(state, { type: 'PREVIEW', budget })
    state = carryForwardReducer(state, { type: 'START_COMPILE' })
    state = carryForwardReducer(state, { type: 'CANCEL_COMPILE' })
    expect(state).toMatchObject({ kind: 'preview', draft: { task: 'Prepare the appeal' }, budget })
    expect('session' in state).toBe(false)
  })

  it('preserves the validated session while budget adjustment awaits recompilation', () => {
    const plan = createInsuranceDenialPlan()
    const budget = createInteractionBudget({ policies: DEFAULT_INTERACTION_POLICIES, receiptId: null })
    let state = carryForwardReducer(createInitialCarryForwardState(), {
      type: 'RESTORE_SESSION',
      status: 'active',
      task: 'Prepare appeal',
      budget,
      session: {
        plan,
        stepIndex: 2,
        completedStepIds: [plan.steps[0].id, plan.steps[1].id],
        choices: { [plan.steps[1].id]: 'portal' },
        checkedItems: {},
        composeDrafts: {},
        expandedChoices: {},
        startedAt: '2026-07-19T12:00:00.000Z',
      },
    })
    state = carryForwardReducer(state, { type: 'ADJUST_ACTIVE_BUDGET' })
    expect(state.kind).toBe('budget')
    if (state.kind !== 'budget') throw new Error('Expected budget adjustment')
    expect(state.resume?.session.stepIndex).toBe(2)
    expect(state.resume?.session.choices).toEqual({ [plan.steps[1].id]: 'portal' })
    const restored = carryForwardReducer(state, { type: 'BACK_TO_SOURCE' })
    expect(restored).toMatchObject({ kind: 'active', session: { stepIndex: 2 } })
  })

  it('reconciles compatible protected progress after an approved budget recompilation', () => {
    const plan = createInsuranceDenialPlan()
    const budget = createInteractionBudget({ policies: DEFAULT_INTERACTION_POLICIES, receiptId: null })
    const session = {
      plan,
      stepIndex: 2,
      completedStepIds: [plan.steps[0].id, plan.steps[1].id],
      choices: { [plan.steps[1].id]: 'portal' },
      checkedItems: { 'denial-letter': true },
      composeDrafts: { 'draft-appeal': 'Preserved draft' },
      expandedChoices: { [plan.steps[1].id]: true },
      startedAt: '2026-07-19T12:00:00.000Z',
    }
    let state = carryForwardReducer(createInitialCarryForwardState(), {
      type: 'RESTORE_SESSION', status: 'active', task: 'Prepare appeal', budget, session,
    })
    state = carryForwardReducer(state, { type: 'ADJUST_ACTIVE_BUDGET' })
    if (state.kind !== 'budget') throw new Error('Expected budget')
    const nextBudget = createInteractionBudget({ policies: state.policies, receiptId: null })
    state = carryForwardReducer(state, { type: 'PREVIEW', budget: nextBudget })
    state = carryForwardReducer(state, { type: 'START_COMPILE' })
    state = carryForwardReducer(state, { type: 'COMPILE_SUCCESS', plan, startedAt: '2026-07-19T13:00:00.000Z' })
    expect(state).toMatchObject({
      kind: 'active',
      session: {
        stepIndex: 2,
        completedStepIds: [plan.steps[0].id, plan.steps[1].id],
        choices: { [plan.steps[1].id]: 'portal' },
        checkedItems: { 'denial-letter': true },
        composeDrafts: { 'draft-appeal': 'Preserved draft' },
        expandedChoices: { [plan.steps[1].id]: true },
        startedAt: '2026-07-19T12:00:00.000Z',
      },
    })
  })

  it('describes only deterministic adaptations for every policy state', () => {
    const enabled = getAdaptationItems(DEFAULT_INTERACTION_POLICIES).map((item) => item.text)
    expect(enabled).toEqual([
      'Show one active step',
      'Show the recommended choice first',
      'Preserve your selections and draft for four hours',
      'Move optional work to Later',
      'Change once, then remain stable',
    ])
    const disabled = getAdaptationItems({ oneStepAtATime: false, fewerDecisions: false, protectProgress: false, deferOptionalWork: false }).map((item) => item.text)
    expect(disabled).toEqual([
      'Keep the complete required plan visible',
      'Show all approved choices',
      'Keep progress only in this open tab',
      'Keep optional work available with the plan',
      'Change once, then remain stable',
    ])
  })

  it('owns every contextual action label exhaustively', () => {
    const steps = createInsuranceDenialPlan().steps
    expect(steps.map((step) => getStepActionLabel(step, false))).toEqual([
      'Continue',
      'Confirm choice',
      'Continue',
      'Save draft',
      'Finish review',
    ])
    for (const step of steps) expect(getStepActionLabel(step, true)).toBe('Close this task')
  })

  it('explains causal changes without exposing model reasoning', () => {
    const plan = createInsuranceDenialPlan()
    const session = {
      plan,
      stepIndex: 1,
      completedStepIds: [plan.steps[0].id],
      choices: {},
      checkedItems: {},
      composeDrafts: {},
      expandedChoices: {},
      startedAt: '2026-07-19T12:00:00.000Z',
    }
    const items = getWhyItems(DEFAULT_INTERACTION_POLICIES, plan, session)
    expect(items.map((item) => item.change)).toContain('The recommended choice appears first')
    expect(JSON.stringify(items)).not.toMatch(/prompt|chain of thought|confidence|schema/i)
  })
})
