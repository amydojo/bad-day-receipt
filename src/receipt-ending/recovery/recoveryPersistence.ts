import {
  CARRY_RITUAL_CHECKPOINT_KEY,
  clearCarryRitualCheckpoint,
  loadCarryRitualCheckpoint,
  type CarryRitualCheckpoint,
} from '../../carry-forward/ritual/carryForwardRitualEffects'
import type { RecoveryCopyId } from './recoveryCopy'
import type { RecoveryBoundary } from './receiptEndingRecovery'

interface RecoveryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type CarryCheckpointRecovery =
  | { status: 'none' }
  | { status: 'malformed' }
  | { status: 'foreign' }
  | {
      status: 'recoverable'
      checkpoint: CarryRitualCheckpoint
      copyId: RecoveryCopyId
      boundary: RecoveryBoundary
    }

function mapCheckpoint(checkpoint: CarryRitualCheckpoint): Extract<CarryCheckpointRecovery, { status: 'recoverable' }> {
  if (checkpoint.phase === 'extension-ready') {
    return { status: 'recoverable', checkpoint, copyId: 'carry-extension', boundary: 'extension-ready' }
  }
  if (checkpoint.phase === 'stub-separated') {
    return { status: 'recoverable', checkpoint, copyId: 'carry-separated', boundary: 'stub-separated' }
  }
  if (checkpoint.phase === 'actuator-ready') {
    return { status: 'recoverable', checkpoint, copyId: 'carry-actuator', boundary: 'actuator-ready' }
  }
  if (checkpoint.phase === 'transfer-issued') {
    return { status: 'recoverable', checkpoint, copyId: 'carry-issued', boundary: 'transfer-issued' }
  }

  if (checkpoint.recoveryReason === 'intake-jam') {
    return { status: 'recoverable', checkpoint, copyId: 'carry-intake', boundary: 'stub-separated' }
  }
  if (checkpoint.recoveryReason === 'conversion-failed') {
    return { status: 'recoverable', checkpoint, copyId: 'carry-conversion', boundary: 'actuator-ready' }
  }
  return { status: 'recoverable', checkpoint, copyId: 'carry-extension', boundary: 'extension-ready' }
}

export function reconcileCarryRitualCheckpoint(
  storage: RecoveryStorage,
  receiptId: string,
): CarryCheckpointRecovery {
  let raw: string | null
  try {
    raw = storage.getItem(CARRY_RITUAL_CHECKPOINT_KEY)
  } catch {
    return { status: 'none' }
  }
  if (!raw) return { status: 'none' }

  const checkpoint = loadCarryRitualCheckpoint(storage)
  if (!checkpoint) {
    clearCarryRitualCheckpoint(storage)
    return { status: 'malformed' }
  }
  if (checkpoint.receiptId !== receiptId) {
    clearCarryRitualCheckpoint(storage)
    return { status: 'foreign' }
  }
  return mapCheckpoint(checkpoint)
}

export function dismissCarryRitualRecovery(storage: RecoveryStorage): boolean {
  return clearCarryRitualCheckpoint(storage)
}
