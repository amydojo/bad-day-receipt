import { describe, expect, it } from 'vitest'
import {
  collectExplicitObligations,
  confirmObligation,
  createManualObligation,
  getObligationChoiceModel,
  parseExplicitObligation,
} from './obligationProvenance'

describe('obligation provenance', () => {
  it('creates only supported explicit provenance and requires later confirmation', () => {
    const obligation = parseExplicitObligation({
      text: 'Reply to the insurance denial',
      source: 'explicit-current-input',
    })
    expect(obligation).toEqual({
      text: 'Reply to the insurance denial',
      source: 'explicit-current-input',
      confirmedByUser: false,
    })
    expect(obligation && confirmObligation(obligation).confirmedByUser).toBe(true)
  })

  it('supports prior input and authored demo fixtures without treating either as confirmed', () => {
    expect(collectExplicitObligations({
      explicitPriorInputs: ['Prepare questions for the clinic'],
      authoredDemoFixtures: ['Reply to the insurance denial'],
    })).toEqual([
      {
        text: 'Prepare questions for the clinic',
        source: 'explicit-prior-input',
        confirmedByUser: false,
      },
      {
        text: 'Reply to the insurance denial',
        source: 'authored-demo-fixture',
        confirmedByUser: false,
      },
    ])
  })

  it('creates manual provenance only from a user-authored field value', () => {
    expect(createManualObligation('  Review the application  ')).toEqual({
      text: 'Review the application',
      source: 'manual',
      confirmedByUser: false,
    })
  })

  it('rejects receipt, total, theme, verdict, emotional, behavioral, and model-derived shapes', () => {
    const prohibited = [
      { receiptItems: ['Insurance denial'], total: 88 },
      { theme: 'government', text: 'File an appeal' },
      { verdict: 'dented but operational', text: 'Rest' },
      { emotionalWording: 'overwhelmed', text: 'Cancel everything' },
      { interactionBehavior: 'hesitated', text: 'Ask for help' },
      { inferredCapacity: 'low', text: 'Do less' },
      { modelOutput: 'Reply to the denial', text: 'Reply to the denial' },
    ]
    for (const candidate of prohibited) {
      expect(parseExplicitObligation(candidate)).toBeNull()
      expect(collectExplicitObligations(candidate)).toEqual([])
    }
  })

  it('shows one explicit obligation as a suggestion and several as unselected alternatives', () => {
    const one = collectExplicitObligations({ explicitCurrentInputs: ['Reply to the landlord'] })
    expect(getObligationChoiceModel(one)).toEqual({ suggestion: one[0], alternatives: [] })

    const several = collectExplicitObligations({
      explicitCurrentInputs: ['Reply to the landlord', 'Review the estimate'],
    })
    expect(getObligationChoiceModel(several)).toEqual({ suggestion: null, alternatives: several })
  })

  it('returns no suggestion for uncertain, malformed, or empty input', () => {
    expect(collectExplicitObligations(null)).toEqual([])
    expect(collectExplicitObligations({ explicitCurrentInputs: ['x', ''] })).toEqual([])
  })
})
