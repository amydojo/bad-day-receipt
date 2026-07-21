import {
  persistMachineData,
  type PersistedMachineData,
  type StorageAdapter,
} from '../../soft-machine/persistence'
import type { CompletedReceiptSnapshot } from '../completedReceipt'
import type { ReleaseOrigin } from '../receiptEndingTypes'
import {
  createExpiredReleaseProjection,
  createReleaseProjection,
  createUndoReleaseProjection,
} from './releasePersistence'

export type ReleaseApplicationResult =
  | { status: 'saved'; data: PersistedMachineData }
  | { status: 'unavailable' }
  | { status: 'failed'; reason: 'storage-write-failed' | 'release-validation-failed' }

export function commitReleaseToMachineStorage({
  current,
  receipt,
  origin,
  undoUntil,
  storage,
}: {
  current: PersistedMachineData
  receipt: CompletedReceiptSnapshot
  origin: ReleaseOrigin
  undoUntil: string
  storage?: StorageAdapter | null
}): ReleaseApplicationResult {
  const projection = createReleaseProjection({
    pendingReceipt: current.pendingReceipt,
    privateArchive: current.privateArchive,
    receiptDispositions: current.receiptDispositions,
    receipt,
    origin,
    undoUntil,
  })
  if (!projection) return { status: 'failed', reason: 'release-validation-failed' }

  const data: PersistedMachineData = { ...current, ...projection }
  const persisted = persistMachineData(data, storage)
  if (persisted.status === 'saved') return { status: 'saved', data }
  if (persisted.status === 'unavailable') return { status: 'unavailable' }
  return { status: 'failed', reason: 'storage-write-failed' }
}

export function undoReleaseInMachineStorage({
  current,
  now,
  storage,
}: {
  current: PersistedMachineData
  now?: Date
  storage?: StorageAdapter | null
}): ReleaseApplicationResult {
  const projection = createUndoReleaseProjection({
    pendingReceipt: current.pendingReceipt,
    pendingRelease: current.pendingRelease,
    privateArchive: current.privateArchive,
    receiptDispositions: current.receiptDispositions,
    now,
  })
  if (!projection) return { status: 'failed', reason: 'release-validation-failed' }

  const data: PersistedMachineData = { ...current, ...projection }
  const persisted = persistMachineData(data, storage)
  if (persisted.status === 'saved') return { status: 'saved', data }
  if (persisted.status === 'unavailable') return { status: 'unavailable' }
  return { status: 'failed', reason: 'storage-write-failed' }
}

export function expireReleaseInMachineStorage({
  current,
  now,
  storage,
}: {
  current: PersistedMachineData
  now?: Date
  storage?: StorageAdapter | null
}): ReleaseApplicationResult {
  const projection = createExpiredReleaseProjection({
    pendingRelease: current.pendingRelease,
    now,
  })
  if (!projection) return { status: 'failed', reason: 'release-validation-failed' }

  const data: PersistedMachineData = { ...current, ...projection }
  const persisted = persistMachineData(data, storage)
  if (persisted.status === 'saved') return { status: 'saved', data }
  if (persisted.status === 'unavailable') return { status: 'unavailable' }
  return { status: 'failed', reason: 'storage-write-failed' }
}
