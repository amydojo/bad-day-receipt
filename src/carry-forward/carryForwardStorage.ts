import { z } from 'zod'
import { InteractionBudgetSchema, type InteractionBudget } from './interactionBudget'
import { parseValidatedTaskPlan } from './taskPlanSchema'
import { TASK_PLAN_LIMITS } from './taskPlanLimits'
import type { CarryForwardDraft, FallbackReason, RuntimeSession } from './carryForwardReducer'

export const CARRY_FORWARD_STORAGE_KEY = 'bad-day-receipt:carry-forward:v1'
export const CARRY_FORWARD_RECEIPT_SEED_KEY = 'bad-day-receipt:carry-forward-seed:v1'

const storedSessionSchema = z.object({
  version: z.literal(1),
  status: z.enum(['active', 'complete']),
  task: z.string().min(1).max(240),
  budget: InteractionBudgetSchema,
  plan: z.unknown(),
  progress: z.object({
    stepIndex: z.number().int().nonnegative().max(4),
    completedStepIds: z.array(z.string().max(64)).max(5),
    choices: z.record(z.string(), z.string().max(64)),
    checkedItems: z.record(z.string(), z.boolean()),
    composeDrafts: z.record(z.string(), z.string().max(4000)),
    expandedChoices: z.record(z.string(), z.boolean()),
    startedAt: z.string().datetime(),
  }).strict(),
}).strict()

const fallbackReasonSchema = z.enum(['offline', 'timeout', 'rate_limited', 'refusal', 'invalid_plan', 'server_error'])

const storedFallbackSchema = z.object({
  version: z.literal(1),
  status: z.literal('fallback'),
  task: z.string().min(1).max(TASK_PLAN_LIMITS.task),
  budget: InteractionBudgetSchema,
  reason: fallbackReasonSchema,
  manualItems: z.array(z.string().max(180)).min(1).max(5),
  manualDraft: z.string().max(TASK_PLAN_LIMITS.composeDraft),
}).strict()

export type StoredCarryForwardSession = {
  status: 'active' | 'complete'
  task: string
  budget: InteractionBudget
  session: RuntimeSession
}

export type StoredCarryForwardFallback = {
  status: 'fallback'
  draft: CarryForwardDraft
  budget: InteractionBudget
  reason: FallbackReason
  manualItems: string[]
  manualDraft: string
}

export type CarryForwardLoadResult =
  | { status: 'empty' }
  | { status: 'expired'; receiptId: string | null }
  | { status: 'ready'; value: StoredCarryForwardSession | StoredCarryForwardFallback }

export function saveCarryForwardSession(
  storage: Pick<Storage, 'setItem'>,
  value: StoredCarryForwardSession,
): boolean {
  const protectProgress = value.budget.policies.protectProgress
  if (!protectProgress) return true
  try {
    storage.setItem(CARRY_FORWARD_STORAGE_KEY, JSON.stringify({
      version: 1,
      status: value.status,
      task: value.task,
      budget: value.budget,
      plan: value.session.plan,
      progress: {
        stepIndex: value.session.stepIndex,
        completedStepIds: value.session.completedStepIds,
        choices: value.session.choices,
        checkedItems: value.session.checkedItems,
        composeDrafts: value.session.composeDrafts,
        expandedChoices: value.session.expandedChoices,
        startedAt: value.session.startedAt,
      },
    }))
    return true
  } catch {
    return false
  }
}

export function saveCarryForwardFallback(
  storage: Pick<Storage, 'setItem'>,
  value: StoredCarryForwardFallback,
): boolean {
  if (!value.budget.policies.protectProgress) return true
  try {
    storage.setItem(CARRY_FORWARD_STORAGE_KEY, JSON.stringify({
      version: 1,
      status: 'fallback',
      task: value.draft.task,
      budget: value.budget,
      reason: value.reason,
      manualItems: value.manualItems,
      manualDraft: value.manualDraft,
    }))
    return true
  } catch {
    return false
  }
}

export function loadCarryForwardSession(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
  now = new Date(),
): CarryForwardLoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(CARRY_FORWARD_STORAGE_KEY)
  } catch {
    return { status: 'empty' }
  }
  if (!raw) return { status: 'empty' }

  try {
    const decoded: unknown = JSON.parse(raw)
    const fallback = storedFallbackSchema.safeParse(decoded)
    if (fallback.success) {
      if (new Date(fallback.data.budget.expiresAt).getTime() <= now.getTime()) {
        clearCarryForwardSession(storage)
        return { status: 'expired', receiptId: fallback.data.budget.receiptId }
      }
      return {
        status: 'ready',
        value: {
          status: 'fallback',
          draft: { task: fallback.data.task, source: '', receiptId: fallback.data.budget.receiptId },
          budget: fallback.data.budget,
          reason: fallback.data.reason,
          manualItems: fallback.data.manualItems,
          manualDraft: fallback.data.manualDraft,
        },
      }
    }

    const parsed = storedSessionSchema.safeParse(decoded)
    if (!parsed.success) {
      clearCarryForwardSession(storage)
      return { status: 'empty' }
    }

    if (new Date(parsed.data.budget.expiresAt).getTime() <= now.getTime()) {
      clearCarryForwardSession(storage)
      return { status: 'expired', receiptId: parsed.data.budget.receiptId }
    }

    const plan = parseValidatedTaskPlan(parsed.data.plan)
    if (!plan.success || parsed.data.progress.stepIndex >= plan.data.steps.length) {
      clearCarryForwardSession(storage)
      return { status: 'empty' }
    }

    return {
      status: 'ready',
      value: {
        status: parsed.data.status,
        task: parsed.data.task,
        budget: parsed.data.budget,
        session: { plan: plan.data, ...parsed.data.progress },
      },
    }
  } catch {
    clearCarryForwardSession(storage)
    return { status: 'empty' }
  }
}

export function clearCarryForwardSession(storage: Pick<Storage, 'removeItem'>) {
  try {
    storage.removeItem(CARRY_FORWARD_STORAGE_KEY)
  } catch {
    // Storage denial is non-fatal; in-memory state is still cleared by the reducer.
  }
}

export function saveReceiptSeed(storage: Pick<Storage, 'setItem'>, receiptId: string) {
  try {
    storage.setItem(CARRY_FORWARD_RECEIPT_SEED_KEY, JSON.stringify({ receiptId }))
    return true
  } catch {
    return false
  }
}

export function consumeReceiptSeed(storage: Pick<Storage, 'getItem' | 'removeItem'>) {
  try {
    const raw = storage.getItem(CARRY_FORWARD_RECEIPT_SEED_KEY)
    storage.removeItem(CARRY_FORWARD_RECEIPT_SEED_KEY)
    if (!raw) return null
    const value = z.object({ receiptId: z.string().min(1).max(80) }).strict().parse(JSON.parse(raw))
    return value.receiptId
  } catch {
    return null
  }
}
