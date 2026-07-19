import { zodTextFormat } from 'openai/helpers/zod'
import { describe, expect, it } from 'vitest'
import { validateTaskPlan } from './evidenceVerification'
import {
  INSURANCE_DENIAL_CANDIDATE,
  INSURANCE_DENIAL_SOURCE_RECORD,
  createInsuranceDenialPlan,
} from './fixtures'
import { TaskPlanCandidateSchema, parseTaskPlanCandidate } from './taskPlanSchema'

describe('Carry Forward task plan trust boundary', () => {
  it('creates a strict Structured Outputs format from the runtime schema', () => {
    const format = zodTextFormat(TaskPlanCandidateSchema, 'carry_forward_test')
    expect(format.type).toBe('json_schema')
    expect(format.strict).toBe(true)
  })

  it('accepts the canonical plan with all five supported step kinds', () => {
    const plan = createInsuranceDenialPlan()
    expect(plan.steps.map((step) => step.kind)).toEqual([
      'read',
      'choice',
      'checklist',
      'compose',
      'review',
    ])
  })

  it('rejects unknown keys and unknown step kinds', () => {
    const unknownRoot = { ...INSURANCE_DENIAL_CANDIDATE, modelThoughts: 'render me' }
    expect(parseTaskPlanCandidate(unknownRoot).success).toBe(false)

    const unknownStep = structuredClone(INSURANCE_DENIAL_CANDIDATE) as Record<string, unknown>
    const steps = unknownStep.steps as Array<Record<string, unknown>>
    steps[0] = { id: 'unsafe', title: 'Unsafe', required: true, kind: 'iframe', src: 'bad' }
    expect(parseTaskPlanCandidate(unknownStep).success).toBe(false)
  })

  it('rejects URLs, markup, too many choices, and model-authored offsets', () => {
    const unsafe = structuredClone(INSURANCE_DENIAL_CANDIDATE) as Record<string, unknown>
    unsafe.summary = 'Read https://example.com for details'
    expect(parseTaskPlanCandidate(unsafe).success).toBe(false)

    const offsets = structuredClone(INSURANCE_DENIAL_CANDIDATE) as Record<string, unknown>
    const facts = offsets.extractedFacts as Array<Record<string, unknown>>
    facts[0].startOffset = 0
    expect(parseTaskPlanCandidate(offsets).success).toBe(false)

    const choices = structuredClone(INSURANCE_DENIAL_CANDIDATE) as Record<string, unknown>
    const choiceStep = (choices.steps as Array<Record<string, unknown>>)[1]
    choiceStep.options = [
      { id: 'a', label: 'A', detail: 'A', primary: true },
      { id: 'b', label: 'B', detail: 'B', primary: false },
      { id: 'c', label: 'C', detail: 'C', primary: false },
      { id: 'd', label: 'D', detail: 'D', primary: false },
    ]
    expect(parseTaskPlanCandidate(choices).success).toBe(false)
  })

  it('keeps copy, download, and filenames outside the model contract', () => {
    const modelControlledOutput = structuredClone(INSURANCE_DENIAL_CANDIDATE) as Record<string, unknown>
    modelControlledOutput.output = {
      format: 'plain_text',
      primaryAction: 'download',
      filename: 'model-chosen.txt',
    }
    expect(parseTaskPlanCandidate(modelControlledOutput).success).toBe(false)
  })

  it('derives offsets only after an exact unique evidence match', () => {
    const result = validateTaskPlan(INSURANCE_DENIAL_CANDIDATE, [INSURANCE_DENIAL_SOURCE_RECORD])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const fact = result.plan.extractedFacts[0]
    expect(INSURANCE_DENIAL_SOURCE_RECORD.text.slice(fact.startOffset, fact.endOffset))
      .toBe(fact.evidenceQuote)
  })

  it('fails closed when a quote is missing or appears more than once', () => {
    const missing = structuredClone(INSURANCE_DENIAL_CANDIDATE)
    missing.extractedFacts[0].evidenceQuote = 'A sentence that is not in the source.'
    const missingResult = validateTaskPlan(missing, [INSURANCE_DENIAL_SOURCE_RECORD])
    expect(missingResult).toMatchObject({ ok: false, issues: [{ code: 'quote_missing' }] })

    const repeatedSource = {
      ...INSURANCE_DENIAL_SOURCE_RECORD,
      text: `${INSURANCE_DENIAL_SOURCE_RECORD.text}\nReference number: IR-48291`,
    }
    const ambiguous = validateTaskPlan(INSURANCE_DENIAL_CANDIDATE, [repeatedSource])
    expect(ambiguous).toMatchObject({ ok: false })
    if (!ambiguous.ok) expect(ambiguous.issues.some((issue) => issue.code === 'quote_ambiguous')).toBe(true)
  })

  it('preserves exact whitespace and line endings while deriving evidence offsets', () => {
    const candidate = structuredClone(INSURANCE_DENIAL_CANDIDATE)
    candidate.extractedFacts = [candidate.extractedFacts[0]]
    const read = candidate.steps[0]
    if (read.kind !== 'read') throw new Error('Expected read fixture')
    read.evidenceFactIds = [candidate.extractedFacts[0].id]
    candidate.extractedFacts[0].evidenceQuote = '\r\nYour appeal must be received by August 12, 2026.'
    const source = {
      ...INSURANCE_DENIAL_SOURCE_RECORD,
      text: 'HEADER\r\nYour appeal must be received by August 12, 2026.\r\nFOOTER',
    }

    const exact = validateTaskPlan(candidate, [source])
    expect(exact.ok).toBe(true)
    if (exact.ok) {
      const fact = exact.plan.extractedFacts[0]
      expect(source.text.slice(fact.startOffset, fact.endOffset)).toBe(fact.evidenceQuote)
      expect(fact.evidenceQuote.startsWith('\r\n')).toBe(true)
    }

    expect(validateTaskPlan(candidate, [{ ...source, text: source.text.replaceAll('\r\n', '\n') }])).toMatchObject({
      ok: false,
      issues: [{ code: 'quote_missing', repairable: true }],
    })
  })

  it('requires the displayed fact value to be directly supported by its evidence', () => {
    const unsupported = structuredClone(INSURANCE_DENIAL_CANDIDATE)
    unsupported.extractedFacts[0].value = 'August 13, 2026'
    const result = validateTaskPlan(unsupported, [INSURANCE_DENIAL_SOURCE_RECORD])
    expect(result).toMatchObject({
      ok: false,
      issues: [{
        code: 'value_not_supported',
        path: 'extractedFacts.0.value',
        repairable: true,
      }],
    })
    if (!result.ok) expect(JSON.stringify(result.issues)).not.toContain(INSURANCE_DENIAL_SOURCE_RECORD.text)
  })

  it('rejects duplicate nested ids and duplicate choice labels during application validation', () => {
    const duplicate = structuredClone(INSURANCE_DENIAL_CANDIDATE)
    const choice = duplicate.steps[1]
    if (choice.kind !== 'choice') throw new Error('Expected choice fixture')
    choice.options[1].id = choice.options[0].id
    choice.options[1].label = choice.options[0].label
    const result = validateTaskPlan(duplicate, [INSURANCE_DENIAL_SOURCE_RECORD])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.every((issue) => issue.code === 'semantic_invalid')).toBe(true)
  })
})
