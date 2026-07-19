import { afterEach, describe, expect, it, vi } from 'vitest'
import { CarryForwardCompileError, compileCarryForwardTask, formatPlanOutput } from './carryForwardEffects'
import { createInsuranceDenialPlan } from './fixtures'
import { createInteractionBudget, DEFAULT_INTERACTION_POLICIES } from './interactionBudget'

describe('Carry Forward copy/download output', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('includes committed choices, checklist state, and the user-edited draft', () => {
    const plan = createInsuranceDenialPlan()
    const output = formatPlanOutput(plan, {
      plan,
      stepIndex: 4,
      completedStepIds: plan.steps.map((step) => step.id),
      choices: { 'choose-route': 'portal' },
      checkedItems: { 'denial-letter': true, 'medical-records': true },
      composeDrafts: { 'draft-appeal': 'My reviewed appeal draft.' },
      expandedChoices: {},
      startedAt: '2026-07-18T12:00:00.000Z',
    })

    expect(output).toContain('Selected: Member portal')
    expect(output).toContain('[x] Copy of the denial letter')
    expect(output).toContain('My reviewed appeal draft.')
    expect(output).toContain('LATER')
  })

  it.each([
    ['openai_quota_exhausted', 'server_error'],
    ['openai_rate_limited', 'rate_limited'],
  ] as const)('maps safe compiler code %s to fallback %s', async (code, reason) => {
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { code } }),
      { status: 429, headers: { 'content-type': 'application/json' } },
    )))
    const budget = createInteractionBudget({ policies: DEFAULT_INTERACTION_POLICIES, receiptId: null })

    await expect(compileCarryForwardTask({
      draft: { task: 'Prepare and submit my appeal', source: '', receiptId: null },
      budget,
      signal: new AbortController().signal,
    })).rejects.toEqual(new CarryForwardCompileError(reason))
  })
})
