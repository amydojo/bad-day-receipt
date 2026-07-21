import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createInteractionBudget,
  DEFAULT_INTERACTION_POLICIES,
} from '../interactionBudget'
import { createInsuranceDenialPlan, INSURANCE_DENIAL_SOURCE } from '../fixtures'
import type { CarryRitualHandoff } from '../ritual/carryForwardRitualTypes'
import type { StoredCarryForwardSession } from '../carryForwardStorage'
import {
  createInTreeCompilingState,
  createInTreeRestoredState,
  startTrustedInTreeActivation,
} from './carryForwardIntegration'

function createHandoff(): CarryRitualHandoff {
  return {
    obligation: {
      text: 'Prepare and submit my insurance denial appeal',
      source: 'manual',
      confirmedByUser: true,
    },
    sourceText: INSURANCE_DENIAL_SOURCE,
    budget: createInteractionBudget({
      policies: DEFAULT_INTERACTION_POLICIES,
      receiptId: 'BDR-TEST-027',
    }),
    origin: 'receipt',
    receiptId: 'BDR-TEST-027',
    stubId: 'stub-test-027',
  }
}

function deferred<Result>() {
  let resolve!: (value: Result) => void
  const promise = new Promise<Result>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function compilerResult() {
  return {
    plan: createInsuranceDenialPlan(),
    model: 'gpt-5.6-test',
    repaired: false,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('in-tree Carry Forward integration', () => {
  it('creates a compiling state directly from the confirmed Field Transfer handoff', () => {
    const handoff = createHandoff()
    const state = createInTreeCompilingState(handoff)

    expect(state).toMatchObject({
      kind: 'compiling',
      phase: 'request-accepted',
      draft: {
        task: handoff.obligation.text,
        source: handoff.sourceText,
        receiptId: handoff.receiptId,
      },
      budget: handoff.budget,
    })
    expect('resume' in state).toBe(false)
  })

  it('does not activate from elapsed time before a validated compiler result exists', async () => {
    vi.useFakeTimers()
    const handoff = createHandoff()
    const pending = deferred<ReturnType<typeof compilerResult>>()
    const stages: string[] = []
    const onSuccess = vi.fn()

    const run = startTrustedInTreeActivation({
      draft: createInTreeCompilingState(handoff).draft,
      budget: handoff.budget,
      storage: { setItem: vi.fn() },
      onStage: (stage) => stages.push(stage),
      onSuccess,
      onFailure: vi.fn(),
      onTimeout: vi.fn(),
      minimumApplyingMs: 800,
      performanceNow: () => 0,
      execute: () => pending.promise,
    })

    await vi.advanceTimersByTimeAsync(5_000)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(stages).toEqual(['goal-identified'])

    pending.resolve(compilerResult())
    await run.promise
    await vi.advanceTimersByTimeAsync(799)
    expect(onSuccess).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(stages).toEqual([
      'goal-identified',
      'required-facts-isolated',
      'minimum-interface-ready',
    ])
  })

  it('fails closed when required progress persistence cannot be committed', async () => {
    vi.useFakeTimers()
    const handoff = createHandoff()
    const onFailure = vi.fn()
    const onSuccess = vi.fn()
    const stages: string[] = []

    const run = startTrustedInTreeActivation({
      draft: createInTreeCompilingState(handoff).draft,
      budget: handoff.budget,
      storage: { setItem: () => { throw new Error('storage denied') } },
      onStage: (stage) => stages.push(stage),
      onSuccess,
      onFailure,
      onTimeout: vi.fn(),
      minimumApplyingMs: 0,
      execute: async () => compilerResult(),
    })

    await run.promise
    await vi.runAllTimersAsync()
    expect(onFailure).toHaveBeenCalledWith('server_error')
    expect(onSuccess).not.toHaveBeenCalled()
    expect(stages).toEqual(['goal-identified', 'required-facts-isolated'])
  })

  it('ignores a late compiler response after cancellation', async () => {
    vi.useFakeTimers()
    const handoff = createHandoff()
    const pending = deferred<ReturnType<typeof compilerResult>>()
    const onSuccess = vi.fn()
    const onFailure = vi.fn()

    const run = startTrustedInTreeActivation({
      draft: createInTreeCompilingState(handoff).draft,
      budget: handoff.budget,
      storage: { setItem: vi.fn() },
      onStage: vi.fn(),
      onSuccess,
      onFailure,
      onTimeout: vi.fn(),
      minimumApplyingMs: 0,
      execute: () => pending.promise,
    })

    run.cancel()
    pending.resolve(compilerResult())
    await run.promise
    await vi.runAllTimersAsync()

    expect(run.signal.aborted).toBe(true)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('persists the validated runtime without persisting source text', async () => {
    vi.useFakeTimers()
    const handoff = createHandoff()
    let stored = ''
    const onSuccess = vi.fn()

    const run = startTrustedInTreeActivation({
      draft: createInTreeCompilingState(handoff).draft,
      budget: handoff.budget,
      storage: { setItem: (_key, value) => { stored = value } },
      onStage: vi.fn(),
      onSuccess,
      onFailure: vi.fn(),
      onTimeout: vi.fn(),
      minimumApplyingMs: 0,
      execute: async () => compilerResult(),
    })

    await run.promise
    await vi.runAllTimersAsync()

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(stored).toContain('Prepare and submit my insurance denial appeal')
    expect(stored).not.toContain(INSURANCE_DENIAL_SOURCE)
    expect(stored).not.toContain('sourceText')
  })

  it('maps an existing validated session back into the shared reducer state', () => {
    const handoff = createHandoff()
    const plan = createInsuranceDenialPlan()
    const stored: StoredCarryForwardSession = {
      status: 'active',
      task: handoff.obligation.text,
      budget: handoff.budget,
      session: {
        plan,
        stepIndex: 1,
        completedStepIds: [plan.steps[0].id],
        choices: {},
        checkedItems: {},
        composeDrafts: {},
        expandedChoices: {},
        startedAt: '2026-07-21T00:00:00.000Z',
      },
    }

    expect(createInTreeRestoredState(stored)).toEqual({
      kind: 'active',
      task: stored.task,
      budget: stored.budget,
      session: stored.session,
    })
  })
})
