import { describe, expect, it } from 'vitest'
import { createInteractionBudget } from '../interactionBudget'
import {
  CARRY_RITUAL_CHECKPOINT_KEY,
  clearCarryRitualCheckpoint,
  createCarryRitualCheckpoint,
  getCarryRitualPhaseAdvance,
  getNextFallbackActuatorEvent,
  loadCarryRitualCheckpoint,
  saveCarryRitualCheckpoint,
} from './carryForwardRitualEffects'
import { createInitialCarryRitualState } from './carryForwardRitualReducer'
import type { CarryRitualState } from './carryForwardRitualTypes'

function createState(): CarryRitualState {
  return createInitialCarryRitualState({
    obligation: {
      text: 'Reply to the insurance denial',
      source: 'manual',
      confirmedByUser: true,
    },
    sourceText: 'Private source text that must not enter the checkpoint.',
    budget: createInteractionBudget({
      policies: {
        oneStepAtATime: true,
        fewerDecisions: true,
        protectProgress: true,
        deferOptionalWork: true,
      },
      receiptId: 'BD-85',
      now: new Date('2026-07-21T00:00:00.000Z'),
    }),
    origin: 'receipt',
    receiptId: 'BD-85',
  })
}

function createStorage() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

describe('Carry Forward ritual effects', () => {
  it('uses the exact 120ms lock and reduced-motion phase durations', () => {
    expect(getCarryRitualPhaseAdvance('actuator-locked', false)).toEqual({
      delay: 120,
      event: { type: 'LOCK_SETTLED' },
    })
    expect(getCarryRitualPhaseAdvance('extension-printing', true)).toEqual({
      delay: 80,
      event: { type: 'EXTENSION_PRINTED' },
    })
    expect(getCarryRitualPhaseAdvance('extension-ready', false)).toBeNull()
  })

  it('advances the keyboard fallback through the same semantic milestones', () => {
    expect(getNextFallbackActuatorEvent(null)).toMatchObject({ milestone: 'easy', progress: 0.25 })
    expect(getNextFallbackActuatorEvent('easy')).toMatchObject({ milestone: 'medium', progress: 0.6 })
    expect(getNextFallbackActuatorEvent('medium')).toMatchObject({ milestone: 'heavy', progress: 0.84 })
    expect(getNextFallbackActuatorEvent('heavy')).toMatchObject({ milestone: 'detent', progress: 0.94 })
    expect(getNextFallbackActuatorEvent('detent')).toMatchObject({ milestone: 'locked', progress: 1 })
  })

  it('creates checkpoints only at stable mechanical boundaries', () => {
    const initial = createState()
    expect(createCarryRitualCheckpoint(initial)).toBeNull()

    for (const phase of [
      'extension-ready',
      'stub-separated',
      'actuator-ready',
      'transfer-issued',
      'recovery',
    ] as const) {
      expect(createCarryRitualCheckpoint({
        ...initial,
        phase,
        recoveryReason: phase === 'recovery' ? 'intake-jam' : null,
      })).toMatchObject({ phase, receiptId: 'BD-85', stubId: 'carry-stub-bd-85' })
    }
  })

  it('stores no obligation, source text, or Interaction Budget payload', () => {
    const storage = createStorage()
    const checkpoint = createCarryRitualCheckpoint({
      ...createState(),
      phase: 'extension-ready',
    })
    expect(checkpoint).not.toBeNull()
    if (!checkpoint) return

    expect(saveCarryRitualCheckpoint(storage, checkpoint)).toBe(true)
    const raw = storage.values.get(CARRY_RITUAL_CHECKPOINT_KEY) ?? ''
    expect(raw).toContain('extension-ready')
    expect(raw).not.toContain('Reply to the insurance denial')
    expect(raw).not.toContain('Private source text')
    expect(raw).not.toContain('policies')
    expect(raw).not.toContain('expiresAt')
    expect(loadCarryRitualCheckpoint(storage)).toEqual(checkpoint)
  })

  it('rejects malformed checkpoints and clears the stable record', () => {
    const storage = createStorage()
    storage.setItem(CARRY_RITUAL_CHECKPOINT_KEY, JSON.stringify({
      version: 1,
      phase: 'actuator-medium',
      receiptId: 'BD-85',
      stubId: 'carry-stub-bd-85',
      actuatorMilestone: 'medium',
      recoveryReason: null,
    }))
    expect(loadCarryRitualCheckpoint(storage)).toBeNull()

    storage.setItem(CARRY_RITUAL_CHECKPOINT_KEY, '{not-json')
    expect(loadCarryRitualCheckpoint(storage)).toBeNull()
    expect(clearCarryRitualCheckpoint(storage)).toBe(true)
    expect(storage.getItem(CARRY_RITUAL_CHECKPOINT_KEY)).toBeNull()
  })
})
