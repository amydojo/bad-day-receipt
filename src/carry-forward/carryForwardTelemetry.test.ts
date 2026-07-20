import { describe, expect, it } from 'vitest'
import {
  createCarryForwardTelemetryEvent,
  type CarryForwardTelemetryProperties,
} from './carryForwardTelemetry'

describe('Carry Forward telemetry allowlist', () => {
  it('drops properties outside the no-text allowlist', () => {
    const event = createCarryForwardTelemetryEvent('carry_forward_compile_succeeded', {
      state: 'active',
      stepCount: 5,
      task: 'Prepare my private appeal',
      source: 'private notice',
    } as unknown as CarryForwardTelemetryProperties)
    expect(event).toEqual({
      name: 'carry_forward_compile_succeeded',
      properties: { state: 'active', stepCount: 5 },
    })
  })

  it('keeps only valid outcome metadata and drops forged enum values', () => {
    const event = createCarryForwardTelemetryEvent('carry_forward_output_completed', {
      outputKind: 'copy',
      outcome: 'success',
      manual: false,
      stepIndex: 2,
      state: 'private task text',
      durationMs: Number.POSITIVE_INFINITY,
    } as unknown as CarryForwardTelemetryProperties)
    expect(event).toEqual({
      name: 'carry_forward_output_completed',
      properties: { outputKind: 'copy', outcome: 'success', manual: false, stepIndex: 2 },
    })
  })
})
