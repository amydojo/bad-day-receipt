import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CARRY_FORWARD_DOWNLOAD_FILENAME,
  CarryForwardCompileError,
  compileCarryForwardTask,
  copyPlanOutput,
  downloadPlanOutput,
  formatPlanOutput,
} from './carryForwardEffects'
import { createInsuranceDenialPlan } from './fixtures'
import { createInteractionBudget, DEFAULT_INTERACTION_POLICIES } from './interactionBudget'

describe('Carry Forward copy/download output', () => {
  afterEach(() => vi.unstubAllGlobals())

  function completedSession() {
    const plan = createInsuranceDenialPlan()
    return {
      plan,
      session: {
        plan,
        stepIndex: 4,
        completedStepIds: plan.steps.map((step) => step.id),
        choices: { 'choose-route': 'portal' },
        checkedItems: { 'denial-letter': true, 'medical-records': true },
        composeDrafts: { 'draft-appeal': 'My reviewed appeal draft.' },
        expandedChoices: {},
        startedAt: '2026-07-18T12:00:00.000Z',
      },
    }
  }

  it('uses an application-owned download filename', () => {
    expect(CARRY_FORWARD_DOWNLOAD_FILENAME).toBe('carry-forward-plan.txt')
    expect(createInsuranceDenialPlan().output).toEqual({ format: 'plain_text' })
  })

  it('includes committed choices, checklist state, and the user-edited draft', () => {
    const { plan, session } = completedSession()
    const output = formatPlanOutput(plan, session)

    expect(output).toContain('Appeal deadline: August 12, 2026')
    expect(output).toContain('Selected: Member portal')
    expect(output).toContain('[x] Copy of the denial letter')
    expect(output).toContain('My reviewed appeal draft.')
    expect(output).toContain('5. Review before submission')
    expect(output).toContain('Review the appeal, evidence, contact details, and deadline before taking any external action.')
    expect(output).toContain('- Appeal draft')
    expect(output).toContain('- Supporting document checklist')
    expect(output).toContain('- Submission method')
    expect(output).toContain('- Deadline and contact details')
    expect(output).toContain('LATER')

    for (const reviewText of [
      '5. Review before submission',
      'Review the appeal, evidence, contact details, and deadline before taking any external action.',
      '- Appeal draft',
      '- Supporting document checklist',
      '- Submission method',
      '- Deadline and contact details',
    ]) {
      expect(output.split(reviewText)).toHaveLength(2)
    }
    expect(output).not.toMatch(/\b(?:was|has been) submitted\b|submitted successfully/i)
  })

  it('copies the canonical formatted review content', async () => {
    const { plan, session } = completedSession()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await copyPlanOutput(plan, session)

    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText).toHaveBeenCalledWith(formatPlanOutput(plan, session))
    expect(writeText.mock.calls[0][0]).toContain('Review the appeal, evidence, contact details, and deadline before taking any external action.')
    expect(writeText.mock.calls[0][0]).toContain('- Supporting document checklist')
  })

  it('downloads the canonical formatted review content as application-owned plain text', async () => {
    const { plan, session } = completedSession()
    const anchor = { href: '', download: '', click: vi.fn() }
    let downloadedBlob: Blob | undefined
    const createObjectURL = vi.fn((blob: Blob) => {
      downloadedBlob = blob
      return 'blob:carry-forward-test'
    })
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor) })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    downloadPlanOutput(plan, session)

    expect(anchor.download).toBe('carry-forward-plan.txt')
    expect(anchor.href).toBe('blob:carry-forward-test')
    expect(anchor.click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:carry-forward-test')
    expect(downloadedBlob?.type).toBe('text/plain;charset=utf-8')
    const text = await downloadedBlob?.text()
    expect(text).toBe(formatPlanOutput(plan, session))
    expect(text).toContain('Review the appeal, evidence, contact details, and deadline before taking any external action.')
    expect(text).toContain('- Deadline and contact details')
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
