import type {
  InteractionBudget,
  InteractionPolicies,
} from '../interactionBudget'

export type ObligationSource =
  | 'explicit-current-input'
  | 'explicit-prior-input'
  | 'authored-demo-fixture'
  | 'manual'

export interface RemainingObligation {
  text: string
  source: ObligationSource
  confirmedByUser: boolean
}

export type CarryDesignationOrigin =
  | {
      kind: 'receipt'
      receiptId: string
      candidates?: RemainingObligation[]
    }
  | {
      kind: 'direct'
      candidates?: never
    }

export type CarryDesignationFailure =
  | 'ambiguous-obligation'
  | 'invalid-obligation'
  | 'invalid-budget'

export type CarryDesignationState =
  | {
      kind: 'choosing'
      suggestion: RemainingObligation | null
      alternatives: RemainingObligation[]
    }
  | {
      kind: 'editing'
      draft: string
      error: string | null
    }
  | {
      kind: 'source'
      obligation: RemainingObligation
      sourceText: string
      sourceExpanded: boolean
    }
  | {
      kind: 'preset'
      obligation: RemainingObligation
      sourceText: string
      policies: InteractionPolicies
    }
  | {
      kind: 'customizing'
      obligation: RemainingObligation
      sourceText: string
      policies: InteractionPolicies
    }
  | {
      kind: 'ritual-ready'
      obligation: RemainingObligation
      sourceText: string
      budget: InteractionBudget
      origin: CarryDesignationOrigin['kind']
    }
  | {
      kind: 'recovery'
      reason: CarryDesignationFailure
      draft: string
    }

export type CarryDesignationEvent =
  | { type: 'SELECT_SUGGESTION'; obligation: RemainingObligation }
  | { type: 'EDIT_SUGGESTION'; text: string }
  | { type: 'CHOOSE_SOMETHING_ELSE' }
  | { type: 'UPDATE_DRAFT'; value: string }
  | { type: 'CONFIRM_MANUAL'; obligation: RemainingObligation }
  | { type: 'EXPAND_SOURCE' }
  | { type: 'COLLAPSE_SOURCE' }
  | { type: 'UPDATE_SOURCE'; value: string }
  | { type: 'CONTINUE_TO_PRESET' }
  | { type: 'BACK_TO_OBLIGATION' }
  | { type: 'OPEN_CUSTOMIZE' }
  | { type: 'TOGGLE_POLICY'; policy: keyof InteractionPolicies }
  | { type: 'CLOSE_CUSTOMIZE' }
  | { type: 'ISSUE_ADJUSTMENT'; budget: InteractionBudget; origin: CarryDesignationOrigin['kind'] }
  | { type: 'EDIT_AFTER_RECOVERY' }
  | { type: 'RESET'; state: CarryDesignationState }
