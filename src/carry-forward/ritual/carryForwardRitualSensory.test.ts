import { describe, expect, it, vi } from 'vitest'
import type {
  MachineSensoryDirector,
  MachineSensoryEvent,
} from '../../mobile-instrument/sensory/sensoryTypes'
import {
  emitCarryRitualMilestone,
  getCarryRitualSensoryEvents,
  resetCarryActuatorSensoryEligibility,
} from './carryForwardRitualSensory'

function createSensory() {
  return {
    prime: vi.fn(),
    emit: vi.fn(),
    updatePreferences: vi.fn(),
    reset: vi.fn(),
    dispose: vi.fn(),
  } satisfies MachineSensoryDirector
}

describe('Carry Forward sensory milestones', () => {
  it('uses Carry-owned semantic events instead of archive or release aliases', () => {
    expect(getCarryRitualSensoryEvents('stub-separated')).toEqual(['carry-stub-tear'])
    expect(getCarryRitualSensoryEvents('stub-aligning')).toEqual(['carry-intake-start'])
    expect(getCarryRitualSensoryEvents('actuator-detent')).toEqual(['actuator-detent'])
    expect(getCarryRitualSensoryEvents('transform-registering')).toEqual(['transfer-register'])
    expect(getCarryRitualSensoryEvents('transfer-issued')).toEqual([
      'thermal-feed-stop',
      'transfer-issued',
    ])
    expect(getCarryRitualSensoryEvents('recovery')).toEqual([])
  })

  it('emits each semantic event at most once per attempt', () => {
    const sensory = createSensory()
    const emitted = new Set<MachineSensoryEvent>()
    emitCarryRitualMilestone({ sensory, phase: 'actuator-medium', emitted })
    emitCarryRitualMilestone({ sensory, phase: 'actuator-medium', emitted })
    expect(sensory.emit).toHaveBeenCalledTimes(1)
    expect(sensory.emit).toHaveBeenCalledWith('actuator-medium')
  })

  it('restores only actuator milestone eligibility after a safe reset', () => {
    const emitted = new Set<MachineSensoryEvent>([
      'carry-stub-tear',
      'carry-intake-start',
      'actuator-medium',
      'actuator-heavy',
      'actuator-detent',
      'actuator-lock',
    ])
    resetCarryActuatorSensoryEligibility(emitted)
    expect(emitted).toEqual(new Set(['carry-stub-tear', 'carry-intake-start']))
  })

  it('stops the feed before announcing the issued transfer', () => {
    const sensory = createSensory()
    const emitted = new Set<MachineSensoryEvent>(['thermal-feed-start'])
    emitCarryRitualMilestone({ sensory, phase: 'transfer-issued', emitted })
    expect(sensory.emit.mock.calls.map(([event]) => event)).toEqual([
      'thermal-feed-stop',
      'transfer-issued',
    ])
  })
})
