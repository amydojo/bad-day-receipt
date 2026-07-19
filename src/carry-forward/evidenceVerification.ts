import {
  TaskPlanCandidateSchema,
  parseValidatedTaskPlan,
  type TaskPlanCandidate,
  type TaskPlanValidationIssue,
  type TaskPlanValidationResult,
} from './taskPlanSchema'

export type CompilerSource = {
  id: string
  label: string
  text: string
}

function schemaIssues(value: unknown): TaskPlanValidationIssue[] {
  const parsed = TaskPlanCandidateSchema.safeParse(value)
  if (parsed.success) return []
  return parsed.error.issues.map((issue) => ({
    code: 'schema_invalid' as const,
    path: issue.path.join('.') || '$',
  }))
}

export function validateTaskPlan(
  value: unknown,
  sources: CompilerSource[],
): TaskPlanValidationResult {
  const proposed = TaskPlanCandidateSchema.safeParse(value)
  if (!proposed.success) return { ok: false, issues: schemaIssues(value) }

  const issues: TaskPlanValidationIssue[] = []
  const extractedFacts: Array<TaskPlanCandidate['extractedFacts'][number] & {
    startOffset: number
    endOffset: number
  }> = []

  const allIds = [
    ...proposed.data.steps.map((step) => step.id),
    ...proposed.data.later.map((item) => item.id),
    ...proposed.data.extractedFacts.map((fact) => fact.id),
  ]
  if (new Set(allIds).size !== allIds.length) {
    issues.push({ code: 'semantic_invalid', path: '$.ids' })
  }

  proposed.data.steps.forEach((step, index) => {
    if (step.kind === 'choice' && step.options.filter((option) => option.primary).length !== 1) {
      issues.push({ code: 'semantic_invalid', path: `steps.${index}.options` })
    }
    if (step.kind === 'read') {
      step.evidenceFactIds.forEach((factId, factIndex) => {
        if (!proposed.data.extractedFacts.some((fact) => fact.id === factId)) {
          issues.push({ code: 'semantic_invalid', path: `steps.${index}.evidenceFactIds.${factIndex}` })
        }
      })
    }
  })

  proposed.data.extractedFacts.forEach((fact, index) => {
    const source = sources.find((candidate) => candidate.id === fact.sourceId)
    const path = `extractedFacts.${index}.evidenceQuote`
    if (!source) {
      issues.push({ code: 'source_missing', path: `extractedFacts.${index}.sourceId` })
      return
    }

    const startOffset = source.text.indexOf(fact.evidenceQuote)
    if (startOffset < 0) {
      issues.push({ code: 'quote_missing', path })
      return
    }

    if (source.text.indexOf(fact.evidenceQuote, startOffset + 1) >= 0) {
      issues.push({ code: 'quote_ambiguous', path })
      return
    }

    extractedFacts.push({
      ...fact,
      startOffset,
      endOffset: startOffset + fact.evidenceQuote.length,
    })
  })

  if (issues.length > 0) return { ok: false, issues }

  const validated = parseValidatedTaskPlan({ ...proposed.data, extractedFacts })
  if (!validated.success) return { ok: false, issues: schemaIssues(value) }
  return { ok: true, plan: validated.data }
}
