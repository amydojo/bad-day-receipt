import { describe, expect, it } from 'vitest'
import { createInteractionBudget } from '../interactionBudget'
import {
  carryForwardRitualReducer,
  createInitialCarryRitualState,
  toCarryRitualHandoff,
} from './carryForwardRitualReducer'
import type { CarryRitualEvent, CarryRitualState } from './carryForwardRitualTypes'

function createState() {
  return createInitialCarryRitualState({
    obligation: {
      text: 'Reply to the insurance denial',
      source: 'manual',
      confirmedByUser: true,
    },
    sourceText: 'Use the denial letter dated June 8.',
    budget: createInteractionBudget({
      policies: {
        oneStepAtATime: true,
        fewerDecisions: true,
        protectProgress: true,
        deferOptionalWork: true,
      },
      receiptId: 'BD-85',
      now: new Date('2026-07-21T00:00:00.000Z'),
    }),
    origin: 'receipt',
    receiptId: 'BD-85',
  })
}

function reduce(state: CarryRitualState, events: CarryRitualEvent[]) {
  return events.reduce(carryForwardRitualReducer, state)
}

describe('carryForwardRitualReducer', () => {
  it('requires a confirmed user-owned obligation and matching receipt budget', () => {
    const state = createState()
    expect(state.phase).toBe('extension-printing')
    expect(state.stubId).toBe('carry-stub-bd-85')

    expect(() => createInitialCarryRitualState({
      ...state.payload,
      obligation: { ...state.payload.obligation, confirmedByUser: false },
    })).toThrow(/user-confirmed obligation/)

    expect(() => createInitialCarryRitualState({
      ...state.payload,
      receiptId: 'BD-OTHER',
    })).toThrow(/must agree/)
  })

  it('follows the legal physical transformation graph', () => {
    const state = reduce(createState(), [
      { type: 'EXTENSION_PRINTED' },
      { type: 'START_TEAR' },
      { type: 'STUB_SEPARATED' },
      { type: 'START_ALIGNMENT' },
      { type: 'STUB_ALIGNED' },
      { type: 'INTAKE_COMPLETED' },
      { type: 'ACTUATOR_REVEALED' },
      { type: 'ACTUATOR_MILESTONE', milestone: 'easy', progress: 0.2 },
      { type: 'ACTUATOR_MILESTONE', milestone: 'medium', progress: 0.6 },
      { type: 'ACTUATOR_MILESTONE', milestone: 'heavy', progress: 0.84 },
      { type: 'ACTUATOR_MILESTONE', milestone: 'detent', progress: 0.94 },
      { type: 'ACTUATOR_MILESTONE', milestone: 'locked', progress: 1 },
      { type: 'LOCK_SETTLED' },
      { type: 'TRANSFORM_REGISTERED' },
      { type: 'TRANSFER_ISSUED' },
    ])

    expect(state.phase).toBe('transfer-issued')
    expect(state.reachedMilestones).toEqual(['easy', 'medium', 'heavy', 'detent', 'locked'])
    expect(toCarryRitualHandoff(state)).toMatchObject({
      receiptId: 'BD-85',
      stubId: 'carry-stub-bd-85',
      sourceText: 'Use the denial letter dated June 8.',
    })
  })

  it('ignores illegal, duplicate, and regressive actuator milestones', () => {
    let state = reduce(createState(), [
      { type: 'EXTENSION_PRINTED' },
      { type: 'START_TEAR' },
      { type: 'STUB_SEPARATED' },
      { type: 'START_ALIGNMENT' },
      { type: 'STUB_ALIGNED' },
      { type: 'INTAKE_COMPLETED' },
      { type: 'ACTUATOR_REVEALED' },
      { type: 'ACTUATOR_MILESTONE', milestone: 'medium', progress: 0.6 },
    ])

    const duplicate = carryForwardRitualReducer(state, {
      type: 'ACTUATOR_MILESTONE',
      milestone: 'medium',
      progress: 0.6,
    })
    expect(duplicate).toBe(state)

    state = carryForwardRitualReducer(state, {
      type: 'ACTUATOR_MILESTONE',
      milestone: 'easy',
      progress: 0.7,
    })
    expect(state.phase).toBe('actuator-medium')
    expect(state.reachedMilestones).toEqual(['medium'])
  })

  it('springs safely to zero when released before lock', () => {
    const state = reduce(createState(), [
      { type: 'EXTENSION_PRINTED' },
      { type: 'START_TEAR' },
      { type: 'STUB_SEPARATED' },
      { type: 'START_ALIGNMENT' },
      { type: 'STUB_ALIGNED' },
      { type: 'INTAKE_COMPLETED' },
      { type: 'ACTUATOR_REVEALED' },
      { type: 'ACTUATOR_MILESTONE', milestone: 'heavy', progress: 0.86 },
      { type: 'ACTUATOR_RELEASED' },
    ])

    expect(state.phase).toBe('released-early')
    expect(state.actuatorProgress).toBe(0)
    expect(state.actuatorMilestone).toBeNull()

    const reset = carryForwardRitualReducer(state, { type: 'RESET_ACTUATOR' })
    expect(reset.phase).toBe('actuator-ready')
    expect(reset.reachedMilestones).toEqual([])
  })

  it('returns each recovery reason to the nearest safe boundary', () => {
    const tearRecovery = reduce(createState(), [
      { type: 'EXTENSION_PRINTED' },
      { type: 'START_TEAR' },
      { type: 'FAIL', reason: 'tear-canceled' },
      { type: 'RECOVER' },
    ])
    expect(tearRecovery.phase).toBe('extension-ready')

    const intakeRecovery = reduce(createState(), [
      { type: 'EXTENSION_PRINTED' },
      { type: 'START_TEAR' },
      { type: 'STUB_SEPARATED' },
      { type: 'START_ALIGNMENT' },
      { type: 'FAIL', reason: 'intake-jam' },
      { type: 'RECOVER' },
    ])
    expect(intakeRecovery.phase).toBe('stub-separated')

    const conversionRecovery = reduce(createState(), [
      { type: 'EXTENSION_PRINTED' },
      { type: 'START_TEAR' },
      { type: 'STUB_SEPARATED' },
      { type: 'START_ALIGNMENT' },
      { type: 'STUB_ALIGNED' },
      { type: 'INTAKE_COMPLETED' },
      { type: 'ACTUATOR_REVEALED' },
      { type: 'ACTUATOR_MILESTONE', milestone: 'medium', progress: 0.6 },
      { type: 'FAIL', reason: 'conversion-failed' },
      { type: 'RECOVER' },
    ])
    expect(conversionRecovery.phase).toBe('actuator-ready')
    expect(conversionRecovery.reachedMilestones).toEqual([])
  })
})
