import { z } from 'zod'

export const CARRY_FORWARD_TTL_MS = 4 * 60 * 60 * 1000

export const InteractionPolicySchema = z.object({
  oneStepAtATime: z.boolean(),
  fewerDecisions: z.boolean(),
  protectProgress: z.boolean(),
  deferOptionalWork: z.boolean(),
}).strict()

export const InteractionBudgetSchema = z.object({
  version: z.literal(1),
  budgetId: z.string().min(1).max(64),
  taskId: z.string().min(1).max(64),
  declaredBy: z.literal('user'),
  receiptId: z.string().min(1).max(80).nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  policies: InteractionPolicySchema,
  invariants: z.object({
    supportedStepKinds: z.tuple([
      z.literal('read'),
      z.literal('choice'),
      z.literal('compose'),
      z.literal('checklist'),
      z.literal('review'),
    ]),
    maxSteps: z.literal(5),
    outputActions: z.tuple([z.literal('copy'), z.literal('download')]),
  }).strict(),
}).strict()

export type InteractionPolicies = z.infer<typeof InteractionPolicySchema>
export type InteractionBudget = z.infer<typeof InteractionBudgetSchema>

export const DEFAULT_INTERACTION_POLICIES: InteractionPolicies = {
  oneStepAtATime: true,
  fewerDecisions: true,
  protectProgress: true,
  deferOptionalWork: true,
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${prefix}-${Date.now().toString(36)}`
}

export function createInteractionBudget({
  policies,
  receiptId,
  now = new Date(),
}: {
  policies: InteractionPolicies
  receiptId: string | null
  now?: Date
}): InteractionBudget {
  return InteractionBudgetSchema.parse({
    version: 1,
    budgetId: makeId('budget'),
    taskId: makeId('task'),
    declaredBy: 'user',
    receiptId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CARRY_FORWARD_TTL_MS).toISOString(),
    policies,
    invariants: {
      supportedStepKinds: ['read', 'choice', 'compose', 'checklist', 'review'],
      maxSteps: 5,
      outputActions: ['copy', 'download'],
    },
  })
}
