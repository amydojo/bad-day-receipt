import { describe, expect, it } from 'vitest'
import { createDefaultMachineData, type StorageAdapter } from '../../soft-machine/persistence'
import { getTheme } from '../../themes'
import { createCompletedReceiptSnapshot } from '../completedReceipt'
import {
  commitReleaseToMachineStorage,
  expireReleaseInMachineStorage,
  undoReleaseInMachineStorage,
} from './releaseApplicationPersistence'

const receipt = createCompletedReceiptSnapshot({
  receiptNumber: 'BD-20-0083',
  completedAt: '2026-07-20T12:00:00.000Z',
  theme: getTheme('original'),
  items: [{ id: 'normal', label: 'Trying to act normal', amount: 14, kind: 'charge', quantity: 1 }],
  total: 15.19,
  itemCount: 1,
  status: 'dented but operational',
  anomaly: null,
  shareCopy: 'Local only.',
})

function recordingStorage(fail = false): StorageAdapter & { writes: string[] } {
  const writes: string[] = []
  return {
    writes,
    getItem: () => null,
    setItem: (_key, value) => {
      if (fail) throw new Error('denied')
      writes.push(value)
    },
    removeItem: () => undefined,
  }
}

describe('Release application persistence', () => {
  it('writes tombstone and source removal in one envelope', () => {
    const storage = recordingStorage()
    const current = createDefaultMachineData([])
    current.pendingReceipt = receipt

    const result = commitReleaseToMachineStorage({
      current,
      receipt,
      origin: { kind: 'pending' },
      undoUntil: '2026-07-20T12:05:08.000Z',
      storage,
    })

    expect(result.status).toBe('saved')
    expect(storage.writes).toHaveLength(1)
    const envelope = JSON.parse(storage.writes[0])
    expect(envelope.data.pendingReceipt).toBeNull()
    expect(envelope.data.pendingRelease.receipt.receiptNumber).toBe(receipt.receiptNumber)
  })

  it('does not return projected state when the exact write fails', () => {
    const current = createDefaultMachineData([])
    current.pendingReceipt = receipt
    expect(commitReleaseToMachineStorage({
      current,
      receipt,
      origin: { kind: 'pending' },
      undoUntil: '2026-07-20T12:05:08.000Z',
      storage: recordingStorage(true),
    })).toEqual({ status: 'failed', reason: 'storage-write-failed' })
    expect(current.pendingReceipt).toBe(receipt)
    expect(current.pendingRelease).toBeNull()
  })

  it('writes exact Undo restoration once', () => {
    const releaseStorage = recordingStorage()
    const current = createDefaultMachineData([])
    current.pendingReceipt = receipt
    const released = commitReleaseToMachineStorage({
      current,
      receipt,
      origin: { kind: 'pending' },
      undoUntil: '2026-07-20T12:05:08.000Z',
      storage: releaseStorage,
    })
    if (released.status !== 'saved') throw new Error('RELEASE_FAILED')

    const undoStorage = recordingStorage()
    const undone = undoReleaseInMachineStorage({
      current: released.data,
      now: new Date('2026-07-20T12:05:04.000Z'),
      storage: undoStorage,
    })

    expect(undone.status).toBe('saved')
    expect(undoStorage.writes).toHaveLength(1)
    if (undone.status === 'saved') {
      expect(undone.data.pendingReceipt).toBe(receipt)
      expect(undone.data.pendingRelease).toBeNull()
    }
  })

  it('clears only an expired tombstone', () => {
    const current = createDefaultMachineData([])
    current.pendingRelease = {
      receipt,
      undoUntil: '2026-07-20T12:05:08.000Z',
      origin: { kind: 'pending' },
      previousDisposition: null,
    }
    const storage = recordingStorage()
    const result = expireReleaseInMachineStorage({
      current,
      now: new Date('2026-07-20T12:05:09.000Z'),
      storage,
    })
    expect(result.status).toBe('saved')
    expect(storage.writes).toHaveLength(1)
    if (result.status === 'saved') expect(result.data.pendingRelease).toBeNull()
  })
})
