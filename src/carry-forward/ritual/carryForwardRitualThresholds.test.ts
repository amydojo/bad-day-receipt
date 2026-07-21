import { describe, expect, it } from 'vitest'
import {
  ACTUATOR_THRESHOLDS,
  getActuatorMilestone,
  getActuatorResistance,
  shouldCaptureStub,
  shouldSeparateStub,
} from './carryForwardRitualThresholds'

describe('Carry Forward ritual thresholds', () => {
  it('maps the specified actuator thresholds exactly', () => {
    expect(getActuatorMilestone(0)).toBe('easy')
    expect(getActuatorMilestone(0.549)).toBe('easy')
    expect(getActuatorMilestone(ACTUATOR_THRESHOLDS.medium)).toBe('medium')
    expect(getActuatorMilestone(ACTUATOR_THRESHOLDS.heavy)).toBe('heavy')
    expect(getActuatorMilestone(ACTUATOR_THRESHOLDS.detent)).toBe('detent')
    expect(getActuatorMilestone(ACTUATOR_THRESHOLDS.locked)).toBe('locked')
  })

  it('clamps invalid progress and increases resistance monotonically', () => {
    expect(getActuatorMilestone(Number.NaN)).toBe('easy')
    expect(getActuatorMilestone(4)).toBe('locked')
    const samples = [0, 0.2, 0.55, 0.7, 0.8, 0.9, 0.92, 0.97, 1]
      .map(getActuatorResistance)
    expect(samples.every((value, index) => index === 0 || value >= samples[index - 1])).toBe(true)
    expect(samples.at(-1)).toBe(1)
  })

  it('keeps tear and intake capture deterministic', () => {
    expect(shouldSeparateStub(0.71)).toBe(false)
    expect(shouldSeparateStub(0.72)).toBe(true)
    expect(shouldCaptureStub(0.77)).toBe(false)
    expect(shouldCaptureStub(0.78)).toBe(true)
  })
})
