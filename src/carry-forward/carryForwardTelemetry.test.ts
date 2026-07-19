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
})
