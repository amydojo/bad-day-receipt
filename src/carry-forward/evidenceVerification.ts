import {
  TaskPlanCandidateSchema,
  parseValidatedTaskPlan,
  type TaskPlanCandidate,
  type TaskPlanValidationIssue,
  type TaskPlanValidationResult,
} from './taskPlanSchema.js'

export type CompilerSource = {
  id: string
  label: string
  text: string
}

const ISSUE_DETAILS: Record<TaskPlanValidationIssue['code'], {
  message: string
  repairable: boolean
}> = {
  schema_invalid: { message: 'The candidate does not match the task-plan schema.', repairable: true },
  semantic_invalid: { message: 'The candidate violates an application plan invariant.', repairable: true },
  source_missing: { message: 'The fact refers to a source that was not supplied.', repairable: true },
  quote_missing: { message: 'The evidence quote does not exactly match the supplied source.', repairable: true },
  quote_ambiguous: { message: 'The evidence quote occurs more than once in the supplied source.', repairable: true },
  value_not_supported: { message: 'The displayed fact value is not an exact substring of its evidence quote.', repairable: true },
  evidence_range_invalid: { message: 'The application-derived evidence range failed verification.', repairable: false },
}

function validationIssue(
  code: TaskPlanValidationIssue['code'],
  path: string,
): TaskPlanValidationIssue {
  return { code, path, ...ISSUE_DETAILS[code] }
}

function schemaIssues(value: unknown): TaskPlanValidationIssue[] {
  const parsed = TaskPlanCandidateSchema.safeParse(value)
  if (parsed.success) return []
  return parsed.error.issues.map((issue) => validationIssue(
    'schema_invalid',
    issue.path.join('.') || '$',
  ))
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
    proposed.data.id,
    ...proposed.data.steps.map((step) => step.id),
    ...proposed.data.steps.flatMap((step) => step.kind === 'choice'
      ? step.options.map((option) => option.id)
      : step.kind === 'checklist'
        ? step.items.map((item) => item.id)
        : []),
    ...proposed.data.later.map((item) => item.id),
    ...proposed.data.extractedFacts.map((fact) => fact.id),
  ]
  if (new Set(allIds).size !== allIds.length) {
    issues.push(validationIssue('semantic_invalid', '$.ids'))
  }

  proposed.data.steps.forEach((step, index) => {
    if (step.kind === 'choice' && step.options.filter((option) => option.primary).length !== 1) {
      issues.push(validationIssue('semantic_invalid', `steps.${index}.options`))
    }
    if (step.kind === 'choice' && new Set(step.options.map((option) => option.label.toLocaleLowerCase())).size !== step.options.length) {
      issues.push(validationIssue('semantic_invalid', `steps.${index}.options.labels`))
    }
    if (step.kind === 'read') {
      step.evidenceFactIds.forEach((factId, factIndex) => {
        if (!proposed.data.extractedFacts.some((fact) => fact.id === factId)) {
          issues.push(validationIssue('semantic_invalid', `steps.${index}.evidenceFactIds.${factIndex}`))
        }
      })
    }
  })

  proposed.data.extractedFacts.forEach((fact, index) => {
    const source = sources.find((candidate) => candidate.id === fact.sourceId)
    const path = `extractedFacts.${index}.evidenceQuote`
    if (!source) {
      issues.push(validationIssue('source_missing', `extractedFacts.${index}.sourceId`))
      return
    }

    const startOffset = source.text.indexOf(fact.evidenceQuote)
    if (startOffset < 0) {
      issues.push(validationIssue('quote_missing', path))
      return
    }

    if (source.text.indexOf(fact.evidenceQuote, startOffset + 1) >= 0) {
      issues.push(validationIssue('quote_ambiguous', path))
      return
    }

    if (!fact.evidenceQuote.includes(fact.value)) {
      issues.push(validationIssue('value_not_supported', `extractedFacts.${index}.value`))
      return
    }

    const endOffset = startOffset + fact.evidenceQuote.length
    if (source.text.slice(startOffset, endOffset) !== fact.evidenceQuote) {
      issues.push(validationIssue('evidence_range_invalid', path))
      return
    }

    extractedFacts.push({
      ...fact,
      startOffset,
      endOffset,
    })
  })

  if (issues.length > 0) return { ok: false, issues }

  const validated = parseValidatedTaskPlan({ ...proposed.data, extractedFacts })
  if (!validated.success) return { ok: false, issues: schemaIssues(value) }
  return { ok: true, plan: validated.data }
}
