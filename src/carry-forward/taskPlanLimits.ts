export const TASK_PLAN_LIMITS = {
  task: 240,
  source: 6000,
  title: 80,
  goal: 240,
  completionDefinition: 240,
  summary: 320,
  stepCount: 5,
  choiceCount: 3,
  checklistCount: 8,
  factCount: 12,
  evidenceQuote: 500,
  composeDraft: 4000,
  laterCount: 5,
} as const

export const CARRY_FORWARD_COMPILER_LIMITS = {
  requestBytes: 12_000,
  outputTokens: 5_000,
  attemptTimeoutMs: 25_000,
  maxAttempts: 2,
  clientTimeoutMs: 58_000,
} as const
