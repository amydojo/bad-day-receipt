import type {
  FieldAccessConfig,
  FieldAccessContext,
  FieldAccessEnvelope,
} from './fieldAccessTypes'

export const FIELD_ACCESS_STORAGE_KEY = 'labdojo-field-access-v1'
export const FIELD_ACCESS_STORAGE_VERSION = 1

export interface FieldAccessStorageAdapter {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export function createEmptyFieldAccessEnvelope(): FieldAccessEnvelope {
  return {
    version: FIELD_ACCESS_STORAGE_VERSION,
    current: null,
    claims: [],
  }
}

export function loadFieldAccess(
  storage: FieldAccessStorageAdapter | null = browserStorage(),
): FieldAccessEnvelope {
  if (!storage) return createEmptyFieldAccessEnvelope()

  try {
    const raw = storage.getItem(FIELD_ACCESS_STORAGE_KEY)
    if (!raw) return createEmptyFieldAccessEnvelope()
    return parseEnvelope(JSON.parse(raw)) ?? createEmptyFieldAccessEnvelope()
  } catch {
    return createEmptyFieldAccessEnvelope()
  }
}

export function claimFieldAccess(
  config: FieldAccessConfig,
  token: string,
  storage: FieldAccessStorageAdapter | null = browserStorage(),
  now = new Date(),
): FieldAccessContext {
  const normalizedToken = token.toUpperCase()
  const envelope = loadFieldAccess(storage)
  const existing = envelope.claims.find((claim) => (
    claim.edition === config.edition && claim.token === normalizedToken
  ))
  const timestamp = now.toISOString()
  const context: FieldAccessContext = existing
    ? { ...existing, lastAccessedAt: timestamp }
    : {
        edition: config.edition,
        token: normalizedToken,
        objectType: config.objectType,
        machineId: config.machineId,
        firstAccessedAt: timestamp,
        lastAccessedAt: timestamp,
      }

  const claims = [
    context,
    ...envelope.claims.filter((claim) => !(
      claim.edition === context.edition && claim.token === context.token
    )),
  ].slice(0, 24)

  saveFieldAccess({
    version: FIELD_ACCESS_STORAGE_VERSION,
    current: context,
    claims,
  }, storage)

  return context
}

export function getCurrentFieldAccess(
  storage: FieldAccessStorageAdapter | null = browserStorage(),
): FieldAccessContext | null {
  return loadFieldAccess(storage).current
}

export function isRecognizedFieldAccess(
  edition: string,
  token: string,
  storage: FieldAccessStorageAdapter | null = browserStorage(),
): boolean {
  const normalizedToken = token.toUpperCase()
  return loadFieldAccess(storage).claims.some((claim) => (
    claim.edition === edition && claim.token === normalizedToken
  ))
}

export function saveFieldAccess(
  envelope: FieldAccessEnvelope,
  storage: FieldAccessStorageAdapter | null = browserStorage(),
): boolean {
  if (!storage) return false
  try {
    storage.setItem(FIELD_ACCESS_STORAGE_KEY, JSON.stringify(sanitizeEnvelope(envelope)))
    return true
  } catch {
    return false
  }
}

function parseEnvelope(value: unknown): FieldAccessEnvelope | null {
  if (!isRecord(value) || value.version !== FIELD_ACCESS_STORAGE_VERSION) return null
  const claims = Array.isArray(value.claims)
    ? value.claims.map(parseContext).filter(isPresent)
    : []
  const current = parseContext(value.current)

  return {
    version: FIELD_ACCESS_STORAGE_VERSION,
    current,
    claims,
  }
}

function sanitizeEnvelope(envelope: FieldAccessEnvelope): FieldAccessEnvelope {
  const claims = envelope.claims.map(parseContext).filter(isPresent).slice(0, 24)
  const current = parseContext(envelope.current)
  return {
    version: FIELD_ACCESS_STORAGE_VERSION,
    current,
    claims,
  }
}

function parseContext(value: unknown): FieldAccessContext | null {
  if (!isRecord(value)) return null
  if (typeof value.edition !== 'string' || !/^\d{2}$/.test(value.edition)) return null
  if (typeof value.token !== 'string' || !/^[A-Z0-9]{4,24}$/.test(value.token)) return null
  if (value.objectType !== 'recovered-artifact') return null
  if (value.machineId !== 'bad-day-receipt') return null
  if (typeof value.firstAccessedAt !== 'string') return null
  if (typeof value.lastAccessedAt !== 'string') return null

  return {
    edition: value.edition,
    token: value.token,
    objectType: value.objectType,
    machineId: value.machineId,
    firstAccessedAt: value.firstAccessedAt,
    lastAccessedAt: value.lastAccessedAt,
  }
}

function browserStorage(): FieldAccessStorageAdapter | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPresent<T>(value: T | null): value is T {
  return value !== null
}
