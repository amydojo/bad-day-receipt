import { describe, expect, it } from 'vitest'
import { formatPlanOutput } from './carryForwardEffects'
import { createInsuranceDenialPlan } from './fixtures'

describe('Carry Forward copy/download output', () => {
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
})
