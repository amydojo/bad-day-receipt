import { z } from 'zod'
import { TASK_PLAN_LIMITS } from './taskPlanLimits'

const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/
const PROHIBITED_TEXT = /(?:https?:\/\/|www\.|<\/?[a-z][^>]*>|javascript:|mailto:|function_call|tool_call|open_url)/i

function safeText(max: number) {
  return z.string().trim().min(1).max(max).refine(
    (value) => !PROHIBITED_TEXT.test(value),
    'Text contains a URL, markup, or tool/action syntax.',
  )
}

// Evidence is matched byte-for-byte against the submitted source. Never trim or
// normalize it at the schema boundary, or application-derived offsets will no
// longer refer to the representation the user supplied.
const exactEvidenceQuote = z.string()
  .min(1)
  .max(TASK_PLAN_LIMITS.evidenceQuote)
  .refine((value) => value.trim().length > 0, 'Evidence quotes must not be blank.')
  .refine((value) => !PROHIBITED_TEXT.test(value), 'Evidence contains a URL, markup, or tool/action syntax.')

const id = z.string().regex(SAFE_ID)
const requiredStepBase = {
  id,
  title: safeText(80),
  required: z.literal(true),
}

const readStepSchema = z.object({
  ...requiredStepBase,
  kind: z.literal('read'),
  instruction: safeText(160),
  body: safeText(900),
  evidenceFactIds: z.array(id).max(6),
}).strict()

const choiceStepSchema = z.object({
  ...requiredStepBase,
  kind: z.literal('choice'),
  prompt: safeText(160),
  options: z.array(z.object({
    id,
    label: safeText(64),
    detail: safeText(180),
    primary: z.boolean(),
  }).strict()).min(1).max(TASK_PLAN_LIMITS.choiceCount),
}).strict()

const composeStepSchema = z.object({
  ...requiredStepBase,
  kind: z.literal('compose'),
  prompt: safeText(180),
  template: safeText(1200),
  placeholder: safeText(160),
}).strict()

const checklistStepSchema = z.object({
  ...requiredStepBase,
  kind: z.literal('checklist'),
  instruction: safeText(180),
  items: z.array(z.object({
    id,
    label: safeText(140),
  }).strict()).min(1).max(TASK_PLAN_LIMITS.checklistCount),
}).strict()

const reviewStepSchema = z.object({
  ...requiredStepBase,
  kind: z.literal('review'),
  summary: safeText(500),
  includes: z.array(safeText(140)).min(1).max(8),
}).strict()

export const TaskStepSchema = z.discriminatedUnion('kind', [
  readStepSchema,
  choiceStepSchema,
  composeStepSchema,
  checklistStepSchema,
  reviewStepSchema,
])

const proposedFactSchema = z.object({
  id,
  label: safeText(80),
  value: safeText(240),
  sourceId: id,
  evidenceQuote: exactEvidenceQuote,
}).strict()

const extractedFactSchema = proposedFactSchema.extend({
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
}).strict()

const laterItemSchema = z.object({
  id,
  title: safeText(80),
  body: safeText(360),
}).strict()

const planShape = {
  version: z.literal(1),
  id,
  title: safeText(TASK_PLAN_LIMITS.title),
  goal: safeText(TASK_PLAN_LIMITS.goal),
  completionDefinition: safeText(TASK_PLAN_LIMITS.completionDefinition),
  summary: safeText(TASK_PLAN_LIMITS.summary),
  steps: z.array(TaskStepSchema).min(1).max(TASK_PLAN_LIMITS.stepCount),
  later: z.array(laterItemSchema).max(TASK_PLAN_LIMITS.laterCount),
  output: z.object({
    format: z.literal('plain_text'),
  }).strict(),
}

function uniquePlanIds(plan: {
  id: string
  steps: Array<z.infer<typeof TaskStepSchema>>
  later: Array<{ id: string }>
  extractedFacts: Array<{ id: string }>
}) {
  const ids = [
    plan.id,
    ...plan.steps.map((step) => step.id),
    ...plan.steps.flatMap((step) => step.kind === 'choice'
      ? step.options.map((option) => option.id)
      : step.kind === 'checklist'
        ? step.items.map((item) => item.id)
        : []),
    ...plan.later.map((item) => item.id),
    ...plan.extractedFacts.map((fact) => fact.id),
  ]
  return new Set(ids).size === ids.length
}

export const TaskPlanCandidateSchema = z.object({
  ...planShape,
  extractedFacts: z.array(proposedFactSchema).max(TASK_PLAN_LIMITS.factCount),
}).strict()

const validatedTaskPlanSchema = z.object({
  ...planShape,
  extractedFacts: z.array(extractedFactSchema).max(TASK_PLAN_LIMITS.factCount),
}).strict()
  .refine(uniquePlanIds, 'Plan, fact, and LATER ids must be unique.')
  .refine(
    (plan) => plan.steps.every((step) => step.kind !== 'choice'
      || step.options.filter((option) => option.primary).length === 1),
    'Every choice must have exactly one primary option.',
  )
  .refine(
    (plan) => plan.steps.every((step) => step.kind !== 'read'
      || step.evidenceFactIds.every((factId) => plan.extractedFacts.some((fact) => fact.id === factId))),
    'Read steps may reference only validated facts.',
  )
  .refine(
    (plan) => plan.extractedFacts.every(
      (fact) => fact.endOffset - fact.startOffset === fact.evidenceQuote.length,
    ),
    'Evidence offset lengths must match their exact quotes.',
  )
  .brand<'ValidatedTaskPlan'>()

export type TaskStep = z.infer<typeof TaskStepSchema>
export type TaskPlanCandidate = z.infer<typeof TaskPlanCandidateSchema>
export type ValidatedTaskPlan = z.infer<typeof validatedTaskPlanSchema>

export type TaskPlanValidationIssue = {
  code: 'schema_invalid'
    | 'semantic_invalid'
    | 'source_missing'
    | 'quote_missing'
    | 'quote_ambiguous'
    | 'value_not_supported'
    | 'evidence_range_invalid'
  path: string
  message: string
  repairable: boolean
}

export type TaskPlanValidationResult =
  | { ok: true; plan: ValidatedTaskPlan }
  | { ok: false; issues: TaskPlanValidationIssue[] }

export function parseTaskPlanCandidate(value: unknown) {
  return TaskPlanCandidateSchema.safeParse(value)
}

export function parseValidatedTaskPlan(value: unknown) {
  return validatedTaskPlanSchema.safeParse(value)
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled task plan variant: ${JSON.stringify(value)}`)
}
