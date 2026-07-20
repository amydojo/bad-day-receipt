import {
  parsePendingReceipt,
  parsePendingRelease,
  sanitizePrivateArchive,
  sanitizeReceiptDispositions,
} from '../receipt-ending/receiptEndingPersistence'
import type {
  ArchivedReceipt,
  PendingRelease,
  ReceiptDisposition,
} from '../receipt-ending/receiptEndingTypes'
import type { CompletedReceiptSnapshot } from '../receipt-ending/completedReceipt'
import { themes, type ReceiptThemeId } from '../themes'
import type { ReceiptItem } from '../types'
import {
  HISTORY_KEY,
  MAX_HISTORY,
  type SavedTransaction,
} from '../v2'

export const MACHINE_STORAGE_KEY = 'bad-day-receipt-machine-v1'
export const MACHINE_STORAGE_VERSION = 2

export interface PersistedEnvelope<T> {
  version: number
  writtenAt: string
  data: T
}

export interface PendingCommit {
  items: ReceiptItem[]
  themeId: ReceiptThemeId
  startedAt: string
}

export interface PersistedMachineData {
  draft: ReceiptItem[]
  themeId: ReceiptThemeId
  history: SavedTransaction[]
  preferences: {
    soundEnabled: boolean
    hapticsEnabled: boolean
  }
  pendingCommit: PendingCommit | null
  lastCompleted: {
    receiptNumber: string
    completedAt: string
  } | null
  pendingReceipt: CompletedReceiptSnapshot | null
  pendingRelease: PendingRelease | null
  privateArchive: ArchivedReceipt[]
  receiptDispositions: ReceiptDisposition[]
}

export interface StorageAdapter {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type MachinePersistenceResult =
  | { status: 'saved' }
  | { status: 'unavailable' }
  | { status: 'failed'; reason: 'read-failed' | 'write-failed' }

export interface MachineLoadResult {
  data: PersistedMachineData
  status: 'loaded' | 'defaulted' | 'unavailable' | 'recovered'
}

const themeIds = new Set(themes.map((theme) => theme.id))

export function createDefaultMachineData(draft: ReceiptItem[]): PersistedMachineData {
  return {
    draft: cloneItems(draft),
    themeId: 'original',
    history: [],
    preferences: {
      soundEnabled: false,
      hapticsEnabled: true,
    },
    pendingCommit: null,
    lastCompleted: null,
    pendingReceipt: null,
    pendingRelease: null,
    privateArchive: [],
    receiptDispositions: [],
  }
}

export function loadMachineData(
  defaults: PersistedMachineData,
  storage: StorageAdapter | null = browserStorage(),
): PersistedMachineData {
  return loadMachineDataResult(defaults, storage).data
}

export function loadMachineDataResult(
  defaults: PersistedMachineData,
  storage: StorageAdapter | null = browserStorage(),
): MachineLoadResult {
  if (!storage) return { data: defaults, status: 'unavailable' }

  try {
    const raw = storage.getItem(MACHINE_STORAGE_KEY)
    if (!raw) {
      return { data: migrateLegacyHistory(defaults, storage), status: 'defaulted' }
    }

    const parsed: unknown = JSON.parse(raw)
    const envelope = parseEnvelope(parsed)
    if (!envelope) {
      return { data: migrateLegacyHistory(defaults, storage), status: 'recovered' }
    }

    return {
      data: recoverInterruptedPrint(envelope.data),
      status: envelope.version === MACHINE_STORAGE_VERSION ? 'loaded' : 'recovered',
    }
  } catch {
    return { data: migrateLegacyHistory(defaults, storage), status: 'recovered' }
  }
}

export function persistMachineData(
  data: PersistedMachineData,
  storage: StorageAdapter | null = browserStorage(),
): MachinePersistenceResult {
  if (!storage) return { status: 'unavailable' }
  try {
    const envelope: PersistedEnvelope<PersistedMachineData> = {
      version: MACHINE_STORAGE_VERSION,
      writtenAt: new Date().toISOString(),
      data: sanitizeMachineData(data),
    }
    storage.setItem(MACHINE_STORAGE_KEY, JSON.stringify(envelope))
    return { status: 'saved' }
  } catch {
    return { status: 'failed', reason: 'write-failed' }
  }
}

export function saveMachineData(
  data: PersistedMachineData,
  storage: StorageAdapter | null = browserStorage(),
): boolean {
  return persistMachineData(data, storage).status === 'saved'
}

export function resetMachineData(storage: StorageAdapter | null = browserStorage()): boolean {
  if (!storage) return false
  try {
    storage.removeItem(MACHINE_STORAGE_KEY)
    storage.removeItem(HISTORY_KEY)
    return true
  } catch {
    return false
  }
}

export function recoverInterruptedPrint(data: PersistedMachineData): PersistedMachineData {
  if (!data.pendingCommit) return data
  return {
    ...data,
    draft: cloneItems(data.pendingCommit.items),
    themeId: data.pendingCommit.themeId,
    pendingCommit: null,
  }
}

export function appendValidHistory(
  history: SavedTransaction[],
  transaction: SavedTransaction,
): SavedTransaction[] {
  return sanitizeHistory([transaction, ...history])
}

export function sanitizeHistory(value: unknown): SavedTransaction[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isSavedTransaction)
    .filter((item, index, array) => (
      array.findIndex((candidate) => candidate.receiptNumber === item.receiptNumber) === index
    ))
    .slice(0, MAX_HISTORY)
}

function parseEnvelope(value: unknown): PersistedEnvelope<PersistedMachineData> | null {
  if (!isRecord(value)) return null
  if (value.version !== 1 && value.version !== MACHINE_STORAGE_VERSION) return null
  if (typeof value.writtenAt !== 'string') return null
  const data = parseMachineData(value.data)
  if (!data) return null
  return {
    version: value.version,
    writtenAt: value.writtenAt,
    data,
  }
}

function parseMachineData(value: unknown): PersistedMachineData | null {
  if (!isRecord(value)) return null
  const draft = sanitizeItems(value.draft)
  const themeId = isThemeId(value.themeId) ? value.themeId : 'original'
  const history = sanitizeHistory(value.history)
  const preferences = isRecord(value.preferences)
    ? {
        soundEnabled: value.preferences.soundEnabled === true,
        hapticsEnabled: value.preferences.hapticsEnabled !== false,
      }
    : { soundEnabled: false, hapticsEnabled: true }

  return {
    draft,
    themeId,
    history,
    preferences,
    pendingCommit: parsePendingCommit(value.pendingCommit),
    lastCompleted: parseLastCompleted(value.lastCompleted),
    pendingReceipt: parsePendingReceipt(value.pendingReceipt),
    pendingRelease: parsePendingRelease(value.pendingRelease),
    privateArchive: sanitizePrivateArchive(value.privateArchive),
    receiptDispositions: sanitizeReceiptDispositions(value.receiptDispositions),
  }
}

function sanitizeMachineData(data: PersistedMachineData): PersistedMachineData {
  return {
    draft: sanitizeItems(data.draft),
    themeId: isThemeId(data.themeId) ? data.themeId : 'original',
    history: sanitizeHistory(data.history),
    preferences: {
      soundEnabled: data.preferences.soundEnabled === true,
      hapticsEnabled: data.preferences.hapticsEnabled !== false,
    },
    pendingCommit: parsePendingCommit(data.pendingCommit),
    lastCompleted: parseLastCompleted(data.lastCompleted),
    pendingReceipt: parsePendingReceipt(data.pendingReceipt),
    pendingRelease: parsePendingRelease(data.pendingRelease),
    privateArchive: sanitizePrivateArchive(data.privateArchive),
    receiptDispositions: sanitizeReceiptDispositions(data.receiptDispositions),
  }
}

function migrateLegacyHistory(
  defaults: PersistedMachineData,
  storage: StorageAdapter,
): PersistedMachineData {
  try {
    const raw = storage.getItem(HISTORY_KEY)
    if (!raw) return defaults
    return {
      ...defaults,
      history: sanitizeHistory(JSON.parse(raw)),
    }
  } catch {
    return defaults
  }
}

function sanitizeItems(value: unknown): ReceiptItem[] {
  if (!Array.isArray(value)) return []
  return value.filter(isReceiptItem).map((item) => ({ ...item }))
}

function cloneItems(items: ReceiptItem[]): ReceiptItem[] {
  return items.map((item) => ({ ...item }))
}

function parsePendingCommit(value: unknown): PendingCommit | null {
  if (!isRecord(value)) return null
  if (!isThemeId(value.themeId) || typeof value.startedAt !== 'string') return null
  const items = sanitizeItems(value.items)
  if (items.length === 0) return null
  return { items, themeId: value.themeId, startedAt: value.startedAt }
}

function parseLastCompleted(value: unknown): PersistedMachineData['lastCompleted'] {
  if (!isRecord(value)) return null
  if (typeof value.receiptNumber !== 'string' || typeof value.completedAt !== 'string') return null
  return {
    receiptNumber: value.receiptNumber,
    completedAt: value.completedAt,
  }
}

function isReceiptItem(value: unknown): value is ReceiptItem {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.label === 'string'
    && typeof value.amount === 'number'
    && Number.isFinite(value.amount)
    && (value.kind === 'charge' || value.kind === 'credit')
    && typeof value.quantity === 'number'
    && Number.isInteger(value.quantity)
    && value.quantity > 0
    && value.quantity <= 9
}

function isSavedTransaction(value: unknown): value is SavedTransaction {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.receiptNumber === 'string'
    && typeof value.createdAt === 'string'
    && isThemeId(value.themeId)
    && typeof value.themeName === 'string'
    && typeof value.total === 'number'
    && Number.isFinite(value.total)
    && typeof value.itemCount === 'number'
    && Number.isFinite(value.itemCount)
    && typeof value.status === 'string'
    && typeof value.shareCopy === 'string'
}

function isThemeId(value: unknown): value is ReceiptThemeId {
  return typeof value === 'string' && themeIds.has(value as ReceiptThemeId)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function browserStorage(): StorageAdapter | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}
