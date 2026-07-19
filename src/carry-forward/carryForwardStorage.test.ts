import { describe, expect, it } from 'vitest'
import { createInsuranceDenialPlan } from './fixtures'
import { createInteractionBudget, DEFAULT_INTERACTION_POLICIES } from './interactionBudget'
import {
  CARRY_FORWARD_STORAGE_KEY,
  clearCarryForwardSession,
  consumeReceiptSeed,
  loadCarryForwardSession,
  saveCarryForwardSession,
  saveReceiptSeed,
} from './carryForwardStorage'

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    removeItem: (key: string) => { data.delete(key) },
    data,
  }
}

function session(protectProgress = true) {
  const policies = { ...DEFAULT_INTERACTION_POLICIES, protectProgress }
  const budget = createInteractionBudget({
    policies,
    receiptId: 'receipt-42',
    now: new Date('2026-07-18T12:00:00.000Z'),
  })
  return {
    status: 'active' as const,
    task: 'Prepare appeal',
    budget,
    session: {
      plan: createInsuranceDenialPlan(),
      stepIndex: 2,
      completedStepIds: ['read-deadline'],
      choices: { 'choose-route': 'portal' },
      checkedItems: { 'denial-letter': true },
      composeDrafts: { 'draft-appeal': 'private draft' },
      expandedChoices: { 'choose-route': true },
      startedAt: '2026-07-18T12:01:00.000Z',
    },
  }
}

describe('isolated Carry Forward storage', () => {
  it('stores only validated plan, budget, and progress—not raw source', () => {
    const storage = memoryStorage({ 'bad-day-receipt-machine-v1': 'receipt data' })
    saveCarryForwardSession(storage, session())
    const raw = storage.data.get(CARRY_FORWARD_STORAGE_KEY) ?? ''
    expect(raw).not.toContain('INSURANCE DENIAL NOTICE')
    expect(storage.data.get('bad-day-receipt-machine-v1')).toBe('receipt data')
    expect(loadCarryForwardSession(storage, new Date('2026-07-18T13:00:00.000Z')).status).toBe('ready')
  })

  it('does not persist choices or drafts when Protect progress is off', () => {
    const storage = memoryStorage()
    saveCarryForwardSession(storage, session(false))
    const raw = storage.data.get(CARRY_FORWARD_STORAGE_KEY) ?? ''
    expect(raw).not.toContain('private draft')
    const stored = JSON.parse(raw) as {
      status: string
      progress: { stepIndex: number; completedStepIds: string[]; choices: Record<string, string> }
    }
    expect(stored.status).toBe('active')
    expect(stored.progress.stepIndex).toBe(0)
    expect(stored.progress.completedStepIds).toEqual([])
    expect(stored.progress.choices).toEqual({})
  })

  it('expires after four hours and clears only its isolated key', () => {
    const storage = memoryStorage({ unrelated: 'safe' })
    saveCarryForwardSession(storage, session())
    expect(loadCarryForwardSession(storage, new Date('2026-07-18T16:01:00.000Z')).status).toBe('expired')
    expect(storage.data.get('unrelated')).toBe('safe')
    clearCarryForwardSession(storage)
    expect(storage.data.get('unrelated')).toBe('safe')
  })

  it('hands off only minimal receipt-id provenance and consumes it once', () => {
    const storage = memoryStorage()
    saveReceiptSeed(storage, 'BD-2026-0042')
    expect([...storage.data.values()][0]).toBe('{"receiptId":"BD-2026-0042"}')
    expect(consumeReceiptSeed(storage)).toBe('BD-2026-0042')
    expect(consumeReceiptSeed(storage)).toBeNull()
  })
})
