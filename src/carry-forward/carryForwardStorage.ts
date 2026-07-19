import { z } from 'zod'
import { InteractionBudgetSchema, type InteractionBudget } from './interactionBudget'
import { parseValidatedTaskPlan } from './taskPlanSchema'
import type { RuntimeSession } from './carryForwardReducer'

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

export type StoredCarryForwardSession = {
  status: 'active' | 'complete'
  task: string
  budget: InteractionBudget
  session: RuntimeSession
}

export type CarryForwardLoadResult =
  | { status: 'empty' }
  | { status: 'expired'; receiptId: string | null }
  | { status: 'ready'; value: StoredCarryForwardSession }

export function saveCarryForwardSession(
  storage: Pick<Storage, 'setItem'>,
  value: StoredCarryForwardSession,
) {
  const protectProgress = value.budget.policies.protectProgress
  storage.setItem(CARRY_FORWARD_STORAGE_KEY, JSON.stringify({
    version: 1,
    status: protectProgress ? value.status : 'active',
    task: value.task,
    budget: value.budget,
    plan: value.session.plan,
    progress: {
      stepIndex: protectProgress ? value.session.stepIndex : 0,
      completedStepIds: protectProgress ? value.session.completedStepIds : [],
      choices: protectProgress ? value.session.choices : {},
      checkedItems: protectProgress ? value.session.checkedItems : {},
      composeDrafts: protectProgress ? value.session.composeDrafts : {},
      expandedChoices: protectProgress ? value.session.expandedChoices : {},
      startedAt: value.session.startedAt,
    },
  }))
}

export function loadCarryForwardSession(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
  now = new Date(),
): CarryForwardLoadResult {
  const raw = storage.getItem(CARRY_FORWARD_STORAGE_KEY)
  if (!raw) return { status: 'empty' }

  try {
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      storage.removeItem(CARRY_FORWARD_STORAGE_KEY)
      return { status: 'empty' }
    }

    if (new Date(parsed.data.budget.expiresAt).getTime() <= now.getTime()) {
      storage.removeItem(CARRY_FORWARD_STORAGE_KEY)
      return { status: 'expired', receiptId: parsed.data.budget.receiptId }
    }

    const plan = parseValidatedTaskPlan(parsed.data.plan)
    if (!plan.success || parsed.data.progress.stepIndex >= plan.data.steps.length) {
      storage.removeItem(CARRY_FORWARD_STORAGE_KEY)
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
    storage.removeItem(CARRY_FORWARD_STORAGE_KEY)
    return { status: 'empty' }
  }
}

export function clearCarryForwardSession(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem(CARRY_FORWARD_STORAGE_KEY)
}

export function saveReceiptSeed(storage: Pick<Storage, 'setItem'>, receiptId: string) {
  storage.setItem(CARRY_FORWARD_RECEIPT_SEED_KEY, JSON.stringify({ receiptId }))
}

export function consumeReceiptSeed(storage: Pick<Storage, 'getItem' | 'removeItem'>) {
  const raw = storage.getItem(CARRY_FORWARD_RECEIPT_SEED_KEY)
  storage.removeItem(CARRY_FORWARD_RECEIPT_SEED_KEY)
  if (!raw) return null
  try {
    const value = z.object({ receiptId: z.string().min(1).max(80) }).strict().parse(JSON.parse(raw))
    return value.receiptId
  } catch {
    return null
  }
}
