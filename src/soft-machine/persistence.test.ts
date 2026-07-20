import { describe, expect, it } from 'vitest'
import { createCompletedReceiptSnapshot } from '../receipt-ending/completedReceipt'
import { getTheme } from '../themes'
import type { ReceiptItem } from '../types'
import type { SavedTransaction } from '../v2'
import {
  MACHINE_STORAGE_KEY,
  MACHINE_STORAGE_VERSION,
  appendValidHistory,
  createDefaultMachineData,
  loadMachineData,
  loadMachineDataResult,
  persistMachineData,
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

function completedReceipt() {
  return createCompletedReceiptSnapshot({
    receiptNumber: 'BD-20-0080',
    completedAt: '2026-07-20T12:00:00.000Z',
    theme: getTheme('original'),
    items: draft,
    total: 15.19,
    itemCount: 1,
    status: 'dented but operational',
    anomaly: null,
    shareCopy: 'Local only.',
  })
}

describe('versioned machine persistence', () => {
  it('round trips validated v2 state through one envelope', () => {
    const target = storage()
    const data = createDefaultMachineData(draft)
    data.themeId = 'cvs'
    data.preferences.soundEnabled = true
    data.pendingReceipt = completedReceipt()

    expect(saveMachineData(data, target)).toBe(true)
    const envelope = JSON.parse(target.values.get(MACHINE_STORAGE_KEY) ?? '{}')
    expect(envelope.version).toBe(MACHINE_STORAGE_VERSION)
    expect(loadMachineData(createDefaultMachineData([]), target)).toMatchObject({
      themeId: 'cvs',
      preferences: { soundEnabled: true, hapticsEnabled: true },
      pendingReceipt: { receiptNumber: 'BD-20-0080' },
      pendingRelease: null,
      privateArchive: [],
      receiptDispositions: [],
    })
  })

  it('migrates a realistic v1 envelope without losing existing fields', () => {
    const valid = transaction('BD-13-1001')
    const target = storage({
      [MACHINE_STORAGE_KEY]: JSON.stringify({
        version: 1,
        writtenAt: '2026-07-13T12:00:00.000Z',
        data: {
          draft,
          themeId: 'cvs',
          history: [valid],
          preferences: { soundEnabled: true, hapticsEnabled: false },
          pendingCommit: {
            items: draft,
            themeId: 'government',
            startedAt: '2026-07-13T11:59:00.000Z',
          },
          lastCompleted: {
            receiptNumber: valid.receiptNumber,
            completedAt: valid.createdAt,
          },
        },
      }),
    })

    const result = loadMachineDataResult(createDefaultMachineData([]), target)
    expect(result.status).toBe('recovered')
    expect(result.data).toMatchObject({
      draft,
      themeId: 'government',
      history: [valid],
      preferences: { soundEnabled: true, hapticsEnabled: false },
      pendingCommit: null,
      lastCompleted: {
        receiptNumber: valid.receiptNumber,
        completedAt: valid.createdAt,
      },
      pendingReceipt: null,
      pendingRelease: null,
      privateArchive: [],
      receiptDispositions: [],
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

  it('repairs malformed new fields without deleting valid legacy data', () => {
    const valid = transaction('BD-13-1002')
    const target = storage({
      [MACHINE_STORAGE_KEY]: JSON.stringify({
        version: 2,
        writtenAt: '2026-07-20T12:00:00.000Z',
        data: {
          ...createDefaultMachineData(draft),
          history: [valid],
          pendingReceipt: { malformed: true },
          pendingRelease: { malformed: true },
          privateArchive: [{ malformed: true }],
          receiptDispositions: [{ malformed: true }],
        },
      }),
    })

    expect(loadMachineData(createDefaultMachineData([]), target)).toMatchObject({
      draft,
      history: [valid],
      pendingReceipt: null,
      pendingRelease: null,
      privateArchive: [],
      receiptDispositions: [],
    })
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

  it('exposes typed storage failure while keeping callers in control', () => {
    const target: StorageAdapter = {
      getItem: () => null,
      setItem: () => { throw new Error('quota') },
      removeItem: () => undefined,
    }
    expect(persistMachineData(createDefaultMachineData(draft), target)).toEqual({
      status: 'failed',
      reason: 'write-failed',
    })
    expect(saveMachineData(createDefaultMachineData(draft), target)).toBe(false)
  })

  it('does not persist Carry Forward task, source, draft, or evidence fields', () => {
    const target = storage()
    const data = createDefaultMachineData(draft)
    data.pendingReceipt = completedReceipt()

    expect(saveMachineData(data, target)).toBe(true)
    const serialized = target.values.get(MACHINE_STORAGE_KEY) ?? ''
    expect(serialized).not.toContain('Prepare and submit my insurance denial appeal')
    expect(serialized).not.toContain('User-provided source')
    expect(serialized).not.toContain('composeDrafts')
    expect(serialized).not.toContain('evidenceQuote')
  })
})
