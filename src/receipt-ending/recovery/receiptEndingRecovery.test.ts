import { describe, expect, it, vi } from 'vitest'
import { CARRY_RITUAL_CHECKPOINT_KEY } from '../../carry-forward/ritual/carryForwardRitualEffects'
import {
  FORBIDDEN_RECOVERY_LANGUAGE,
  RECOVERY_COPY,
  recoveryCopyIsDignified,
} from './recoveryCopy'
import {
  dismissCarryRitualRecovery,
  reconcileCarryRitualCheckpoint,
} from './recoveryPersistence'
import { emitReceiptEndingRecoveryEvent } from './receiptEndingRecovery'

function createStorage() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

function checkpoint(phase: string, receiptId = 'BD-98', recoveryReason: string | null = null) {
  return JSON.stringify({
    version: 1,
    phase,
    receiptId,
    stubId: 'carry-stub-bd-98',
    actuatorMilestone: null,
    recoveryReason,
  })
}

describe('Three Endings recovery contracts', () => {
  it('keeps all centralized copy factual and free of forbidden shame language', () => {
    for (const copy of Object.values(RECOVERY_COPY)) {
      expect(recoveryCopyIsDignified(copy)).toBe(true)
      const normalized = `${copy.eyebrow} ${copy.title} ${copy.body}`.toLowerCase()
      for (const phrase of FORBIDDEN_RECOVERY_LANGUAGE) expect(normalized).not.toContain(phrase)
    }
  })

  it('maps matching Carry checkpoints to the nearest truthful safe boundary', () => {
    const storage = createStorage()
    storage.setItem(CARRY_RITUAL_CHECKPOINT_KEY, checkpoint('extension-ready'))
    expect(reconcileCarryRitualCheckpoint(storage, 'BD-98')).toMatchObject({
      status: 'recoverable',
      copyId: 'carry-extension',
      boundary: 'extension-ready',
    })

    storage.setItem(CARRY_RITUAL_CHECKPOINT_KEY, checkpoint('recovery', 'BD-98', 'intake-jam'))
    expect(reconcileCarryRitualCheckpoint(storage, 'BD-98')).toMatchObject({
      status: 'recoverable',
      copyId: 'carry-intake',
      boundary: 'stub-separated',
    })

    storage.setItem(CARRY_RITUAL_CHECKPOINT_KEY, checkpoint('recovery', 'BD-98', 'conversion-failed'))
    expect(reconcileCarryRitualCheckpoint(storage, 'BD-98')).toMatchObject({
      status: 'recoverable',
      copyId: 'carry-conversion',
      boundary: 'actuator-ready',
    })
  })

  it('clears malformed and foreign checkpoints instead of fabricating provenance', () => {
    const storage = createStorage()
    storage.setItem(CARRY_RITUAL_CHECKPOINT_KEY, '{not-json')
    expect(reconcileCarryRitualCheckpoint(storage, 'BD-98')).toEqual({ status: 'malformed' })
    expect(storage.getItem(CARRY_RITUAL_CHECKPOINT_KEY)).toBeNull()

    storage.setItem(CARRY_RITUAL_CHECKPOINT_KEY, checkpoint('stub-separated', 'ANOTHER-RECEIPT'))
    expect(reconcileCarryRitualCheckpoint(storage, 'BD-98')).toEqual({ status: 'foreign' })
    expect(storage.getItem(CARRY_RITUAL_CHECKPOINT_KEY)).toBeNull()
  })

  it('dismisses the mechanical checkpoint without requiring private task content', () => {
    const storage = createStorage()
    storage.setItem(CARRY_RITUAL_CHECKPOINT_KEY, checkpoint('transfer-issued'))
    expect(dismissCarryRitualRecovery(storage)).toBe(true)
    expect(storage.getItem(CARRY_RITUAL_CHECKPOINT_KEY)).toBeNull()
  })

  it('emits only bounded semantic recovery values and deduplicates after refresh', () => {
    const storage = createStorage()
    const sender = vi.fn()
    const event = {
      domain: 'carry' as const,
      boundary: 'stub-separated' as const,
      outcome: 'presented' as const,
    }

    expect(emitReceiptEndingRecoveryEvent({ event, storage, sender })).toBe(true)
    expect(emitReceiptEndingRecoveryEvent({ event, storage, sender })).toBe(false)
    expect(sender).toHaveBeenCalledTimes(1)
    expect(sender).toHaveBeenCalledWith('three_endings_recovery', event)
    expect(JSON.stringify(sender.mock.calls)).not.toContain('Reply to')
    expect(JSON.stringify(sender.mock.calls)).not.toContain('receiptNumber')
  })
})
