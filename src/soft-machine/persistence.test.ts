import { describe, expect, it } from 'vitest'
import type { ReceiptItem } from '../types'
import type { SavedTransaction } from '../v2'
import {
  MACHINE_STORAGE_KEY,
  appendValidHistory,
  createDefaultMachineData,
  loadMachineData,
  recoverInterruptedPrint,
  resetMachineData,
  saveMachineData,
  type StorageAdapter,
} from './persistence'

const draft: ReceiptItem[] = [
  { id: 'normal', label: 'Trying to act normal', amount: 14, kind: 'charge', quantity: 1 },
]

function storage(seed: Record<string, string> = {}): StorageAdapter & { values: Map<string, string> } {
  const values = new Map(Object.entries(seed))
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: (key) => { values.delete(key) },
  }
}

function transaction(receiptNumber: string): SavedTransaction {
  return {
    id: `${receiptNumber}-1`,
    receiptNumber,
    createdAt: '2026-07-13T12:00:00.000Z',
    themeId: 'original',
    themeName: 'Original',
    total: 14,
    itemCount: 1,
    status: 'dented but operational',
    shareCopy: 'Local only.',
  }
}

describe('versioned machine persistence', () => {
  it('round trips validated state through one envelope', () => {
    const target = storage()
    const data = createDefaultMachineData(draft)
    data.themeId = 'cvs'
    data.preferences.soundEnabled = true

    expect(saveMachineData(data, target)).toBe(true)
    expect(target.values.has(MACHINE_STORAGE_KEY)).toBe(true)
    expect(loadMachineData(createDefaultMachineData([]), target)).toMatchObject({
      themeId: 'cvs',
      preferences: { soundEnabled: true, hapticsEnabled: true },
    })
  })

  it('recovers an interrupted print as a clean idle draft', () => {
    const data = createDefaultMachineData([])
    data.pendingCommit = {
      items: draft,
      themeId: 'cvs',
      startedAt: '2026-07-13T12:00:00.000Z',
    }

    expect(recoverInterruptedPrint(data)).toMatchObject({
      draft,
      themeId: 'cvs',
      pendingCommit: null,
    })
  })

  it('keeps valid history when neighboring records are malformed', () => {
    const valid = transaction('BD-13-1001')
    const target = storage({
      [MACHINE_STORAGE_KEY]: JSON.stringify({
        version: 1,
        writtenAt: '2026-07-13T12:00:00.000Z',
        data: {
          ...createDefaultMachineData(draft),
          history: [valid, { nope: true }],
        },
      }),
    })

    expect(loadMachineData(createDefaultMachineData([]), target).history).toEqual([valid])
  })

  it('deduplicates and limits history without deleting unrelated data', () => {
    const history = Array.from({ length: 7 }, (_, index) => transaction(`BD-13-${1000 + index}`))
    expect(appendValidHistory(history, history[0])).toHaveLength(5)
  })

  it('uses scoped reset keys instead of clearing all storage', () => {
    const target = storage({
      [MACHINE_STORAGE_KEY]: 'machine',
      'other-app': 'keep',
    })
    expect(resetMachineData(target)).toBe(true)
    expect(target.values.get('other-app')).toBe('keep')
    expect(target.values.has(MACHINE_STORAGE_KEY)).toBe(false)
  })

  it('fails safely when storage cannot write', () => {
    const target: StorageAdapter = {
      getItem: () => null,
      setItem: () => { throw new Error('quota') },
      removeItem: () => undefined,
    }
    expect(saveMachineData(createDefaultMachineData(draft), target)).toBe(false)
  })
})
