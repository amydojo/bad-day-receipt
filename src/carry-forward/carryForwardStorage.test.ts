import { describe, expect, it } from 'vitest'
import { createInsuranceDenialPlan } from './fixtures'
import { createInteractionBudget, DEFAULT_INTERACTION_POLICIES } from './interactionBudget'
import {
  CARRY_FORWARD_STORAGE_KEY,
  clearCarryForwardSession,
  consumeReceiptSeed,
  loadCarryForwardSession,
  saveCarryForwardFallback,
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

  it('does not persist any task data when Protect progress is off', () => {
    const storage = memoryStorage()
    saveCarryForwardSession(storage, session(false))
    expect(storage.data.has(CARRY_FORWARD_STORAGE_KEY)).toBe(false)
  })

  it('restores protected manual fallback work without storing raw source', () => {
    const storage = memoryStorage()
    const stored = session()
    saveCarryForwardFallback(storage, {
      status: 'fallback',
      draft: { task: stored.task, source: 'private raw source', receiptId: stored.budget.receiptId },
      budget: stored.budget,
      reason: 'server_error',
      manualItems: ['Gather the notice', 'Draft the appeal'],
      manualDraft: 'A protected manual draft',
    })
    const raw = storage.data.get(CARRY_FORWARD_STORAGE_KEY) ?? ''
    expect(raw).not.toContain('private raw source')
    expect(raw).toContain('A protected manual draft')
    const loaded = loadCarryForwardSession(storage, new Date('2026-07-18T13:00:00.000Z'))
    expect(loaded.status).toBe('ready')
    if (loaded.status !== 'ready' || loaded.value.status !== 'fallback') return
    expect(loaded.value.draft.source).toBe('')
    expect(loaded.value.manualItems).toEqual(['Gather the notice', 'Draft the appeal'])
    expect(loaded.value.manualDraft).toBe('A protected manual draft')
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

  it('returns a safe failure when browser storage rejects a write', () => {
    const storage = {
      setItem() { throw new DOMException('Quota exceeded', 'QuotaExceededError') },
    }
    expect(saveCarryForwardSession(storage, session())).toBe(false)
  })

  it('treats storage read denial as an empty recoverable state', () => {
    const storage = {
      getItem() { throw new DOMException('Denied', 'SecurityError') },
      removeItem() { throw new DOMException('Denied', 'SecurityError') },
    }
    expect(loadCarryForwardSession(storage)).toEqual({ status: 'empty' })
    expect(() => clearCarryForwardSession(storage)).not.toThrow()
  })
})
