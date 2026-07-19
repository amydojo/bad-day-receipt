import { z } from 'zod'
import { parseValidatedTaskPlan, type ValidatedTaskPlan } from './taskPlanSchema'
import type { CarryForwardDraft, FallbackReason, RuntimeSession } from './carryForwardReducer'
import type { InteractionBudget } from './interactionBudget'

export const CARRY_FORWARD_DOWNLOAD_FILENAME = 'carry-forward-plan.txt'

const compileEnvelopeSchema = z.object({
  plan: z.unknown(),
  meta: z.object({
    model: z.string().min(1).max(80),
    repaired: z.boolean(),
  }).strict(),
}).strict()

const compilerErrorEnvelopeSchema = z.object({
  error: z.object({ code: z.string().regex(/^[a-z0-9_]{1,80}$/) }).strict(),
}).strict()

export class CarryForwardCompileError extends Error {
  constructor(public readonly reason: FallbackReason) {
    super(reason)
  }
}

export async function compileCarryForwardTask({
  draft,
  budget,
  signal,
}: {
  draft: CarryForwardDraft
  budget: InteractionBudget
  signal: AbortSignal
}): Promise<{ plan: ValidatedTaskPlan; model: string; repaired: boolean }> {
  if (!navigator.onLine) throw new CarryForwardCompileError('offline')

  let response: Response
  try {
    response = await fetch('/api/compile-task', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requestId: budget.taskId,
        task: draft.task,
        sources: draft.source.trim()
          ? [{ id: 'source-1', label: 'User-provided source', text: draft.source }]
          : [],
        budget,
      }),
      signal,
    })
  } catch (error) {
    if (signal.aborted) throw new CarryForwardCompileError('timeout')
    throw new CarryForwardCompileError('server_error')
  }

  let serverErrorCode = 'unknown_error'
  if (!response.ok) {
    try {
      const parsed = compilerErrorEnvelopeSchema.safeParse(await response.json())
      if (parsed.success) serverErrorCode = parsed.data.error.code
    } catch {
      // A malformed error body remains a generic, non-rendered server failure.
    }
  }

  const safeReason: FallbackReason = response.status === 429
    ? serverErrorCode === 'openai_quota_exhausted' ? 'server_error' : 'rate_limited'
    : response.status === 504
      ? 'timeout'
    : response.status === 422
      ? 'invalid_plan'
    : response.status === 409
        ? serverErrorCode === 'duplicate_request' ? 'rate_limited' : 'refusal'
        : 'server_error'
  if (!response.ok) throw new CarryForwardCompileError(safeReason)

  const envelope = compileEnvelopeSchema.safeParse(await response.json())
  if (!envelope.success) throw new CarryForwardCompileError('invalid_plan')
  const validated = parseValidatedTaskPlan(envelope.data.plan)
  if (!validated.success) throw new CarryForwardCompileError('invalid_plan')

  return {
    plan: validated.data,
    model: envelope.data.meta.model,
    repaired: envelope.data.meta.repaired,
  }
}

export function formatPlanOutput(plan: ValidatedTaskPlan, session: RuntimeSession) {
  const required = plan.steps.map((step, index) => {
    const heading = `${index + 1}. ${step.title}`
    if (step.kind === 'choice') {
      const selected = step.options.find((option) => option.id === session.choices[step.id])
      return selected ? `${heading}\n   Selected: ${selected.label}` : heading
    }
    if (step.kind === 'compose') {
      return `${heading}\n\n${session.composeDrafts[step.id] ?? step.template}`
    }
    if (step.kind === 'checklist') {
      return `${heading}\n${step.items.map((item) => `${session.checkedItems[item.id] ? '[x]' : '[ ]'} ${item.label}`).join('\n')}`
    }
    if (step.kind === 'read') {
      const facts = step.evidenceFactIds
        .map((id) => plan.extractedFacts.find((fact) => fact.id === id))
        .filter((fact) => fact !== undefined)
      return `${heading}\n${facts.map((fact) => `   ${fact.label}: ${fact.value}`).join('\n')}`.trimEnd()
    }
    return `${heading}\n${step.summary}\n${step.includes.map((item) => `- ${item}`).join('\n')}`
  })
  const later = plan.later.length > 0
    ? `\n\nLATER\n${plan.later.map((item) => `- ${item.title}: ${item.body}`).join('\n')}`
    : ''
  return `${plan.title}\nGoal: ${plan.goal}\nComplete when: ${plan.completionDefinition}\n\n${plan.summary}\n\n${required.join('\n')}${later}`
}

export async function copyPlanOutput(plan: ValidatedTaskPlan, session: RuntimeSession) {
  await navigator.clipboard.writeText(formatPlanOutput(plan, session))
}

export function downloadPlanOutput(plan: ValidatedTaskPlan, session: RuntimeSession) {
  const blob = new Blob([formatPlanOutput(plan, session)], { type: 'text/plain;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = CARRY_FORWARD_DOWNLOAD_FILENAME
  anchor.click()
  URL.revokeObjectURL(href)
}
