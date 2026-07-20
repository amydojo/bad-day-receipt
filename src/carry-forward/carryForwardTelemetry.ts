import { track } from '@vercel/analytics'

export const CARRY_FORWARD_EVENT_NAMES = [
  'carry_forward_opened',
  'carry_forward_budget_confirmed',
  'carry_forward_compile_started',
  'carry_forward_compile_succeeded',
  'carry_forward_compile_failed',
  'carry_forward_step_completed',
  'carry_forward_completed',
  'carry_forward_output_completed',
  'carry_forward_ended',
] as const

export type CarryForwardEventName = typeof CARRY_FORWARD_EVENT_NAMES[number]
export type CarryForwardTelemetryProperties = Partial<{
  state: 'bridge' | 'input' | 'recovery' | 'budget' | 'preview' | 'compiling' | 'active' | 'complete' | 'fallback' | 'expired'
  stepKind: 'read' | 'choice' | 'compose' | 'checklist' | 'review'
  errorCode: 'offline' | 'timeout' | 'rate_limited' | 'refusal' | 'invalid_plan' | 'server_error'
  stepCount: number
  stepIndex: number
  durationMs: number
  repaired: boolean
  outputKind: 'copy' | 'download'
  outcome: 'success' | 'failure'
  manual: boolean
  oneStepAtATime: boolean
  fewerDecisions: boolean
  protectProgress: boolean
  deferOptionalWork: boolean
}>

const STATE_VALUES = new Set(['bridge', 'input', 'recovery', 'budget', 'preview', 'compiling', 'active', 'complete', 'fallback', 'expired'])
const STEP_KIND_VALUES = new Set(['read', 'choice', 'compose', 'checklist', 'review'])
const ERROR_CODE_VALUES = new Set(['offline', 'timeout', 'rate_limited', 'refusal', 'invalid_plan', 'server_error'])
const OUTPUT_KIND_VALUES = new Set(['copy', 'download'])
const OUTCOME_VALUES = new Set(['success', 'failure'])

const PROPERTY_VALIDATORS: Record<string, (value: unknown) => value is string | number | boolean> = {
  state: (value): value is string => typeof value === 'string' && STATE_VALUES.has(value),
  stepKind: (value): value is string => typeof value === 'string' && STEP_KIND_VALUES.has(value),
  errorCode: (value): value is string => typeof value === 'string' && ERROR_CODE_VALUES.has(value),
  stepCount: (value): value is number => Number.isInteger(value) && Number(value) >= 0,
  stepIndex: (value): value is number => Number.isInteger(value) && Number(value) >= 0,
  durationMs: (value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0,
  repaired: (value): value is boolean => typeof value === 'boolean',
  outputKind: (value): value is string => typeof value === 'string' && OUTPUT_KIND_VALUES.has(value),
  outcome: (value): value is string => typeof value === 'string' && OUTCOME_VALUES.has(value),
  manual: (value): value is boolean => typeof value === 'boolean',
  oneStepAtATime: (value): value is boolean => typeof value === 'boolean',
  fewerDecisions: (value): value is boolean => typeof value === 'boolean',
  protectProgress: (value): value is boolean => typeof value === 'boolean',
  deferOptionalWork: (value): value is boolean => typeof value === 'boolean',
}

export function createCarryForwardTelemetryEvent(
  name: CarryForwardEventName,
  properties: CarryForwardTelemetryProperties,
) {
  const clean: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(properties)) {
    const validate = PROPERTY_VALIDATORS[key]
    if (validate?.(value)) clean[key] = value
  }
  return { name, properties: clean }
}

export function emitCarryForwardTelemetry(
  name: CarryForwardEventName,
  properties: CarryForwardTelemetryProperties,
) {
  const event = createCarryForwardTelemetryEvent(name, properties)
  window.dispatchEvent(new CustomEvent('bad-day-receipt:telemetry', { detail: event }))
  if (import.meta.env.PROD) track(event.name, event.properties)
}
