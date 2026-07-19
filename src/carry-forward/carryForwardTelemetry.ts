export const CARRY_FORWARD_EVENT_NAMES = [
  'carry_forward_opened',
  'carry_forward_budget_confirmed',
  'carry_forward_compile_started',
  'carry_forward_compile_succeeded',
  'carry_forward_compile_failed',
  'carry_forward_step_completed',
  'carry_forward_completed',
] as const

export type CarryForwardEventName = typeof CARRY_FORWARD_EVENT_NAMES[number]
export type CarryForwardTelemetryProperties = Partial<{
  state: 'input' | 'budget' | 'preview' | 'compiling' | 'active' | 'complete' | 'fallback' | 'expired'
  stepKind: 'read' | 'choice' | 'compose' | 'checklist' | 'review'
  errorCode: 'offline' | 'timeout' | 'rate_limited' | 'refusal' | 'invalid_plan' | 'server_error'
  stepCount: number
  durationMs: number
  repaired: boolean
  oneStepAtATime: boolean
  fewerDecisions: boolean
  protectProgress: boolean
  deferOptionalWork: boolean
}>

const ALLOWED_KEYS = new Set([
  'state',
  'stepKind',
  'errorCode',
  'stepCount',
  'durationMs',
  'repaired',
  'oneStepAtATime',
  'fewerDecisions',
  'protectProgress',
  'deferOptionalWork',
])

export function createCarryForwardTelemetryEvent(
  name: CarryForwardEventName,
  properties: CarryForwardTelemetryProperties,
) {
  const clean = Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => ALLOWED_KEYS.has(key)
      && (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string')),
  )
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
import { track } from '@vercel/analytics'
