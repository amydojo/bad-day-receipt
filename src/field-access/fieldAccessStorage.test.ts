import { describe, expect, it } from 'vitest'
import { getFieldAccessConfig } from './fieldAccessConfig'
import {
  FIELD_ACCESS_STORAGE_KEY,
  claimFieldAccess,
  getCurrentFieldAccess,
  isRecognizedFieldAccess,
  loadFieldAccess,
  type FieldAccessStorageAdapter,
} from './fieldAccessStorage'

function createMemoryStorage(): FieldAccessStorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

describe('field access persistence', () => {
  it('claims a physical object and remembers it as the current LD-001 access key', () => {
    const storage = createMemoryStorage()
    const config = getFieldAccessConfig('07')
    expect(config).not.toBeNull()
    if (!config) return

    const claim = claimFieldAccess(
      config,
      'j49aqw',
      storage,
      new Date('2026-07-16T07:00:00.000Z'),
    )

    expect(claim.token).toBe('J49AQW')
    expect(claim.machineId).toBe('LD-001')
    expect(getCurrentFieldAccess(storage)).toEqual(claim)
    expect(isRecognizedFieldAccess('07', 'J49AQW', storage)).toBe(true)
  })

  it('updates last access without duplicating the same object', () => {
    const storage = createMemoryStorage()
    const config = getFieldAccessConfig('07')
    if (!config) throw new Error('Missing field object 07 config')

    claimFieldAccess(config, 'J49AQW', storage, new Date('2026-07-16T07:00:00.000Z'))
    claimFieldAccess(config, 'J49AQW', storage, new Date('2026-07-17T07:00:00.000Z'))

    const envelope = loadFieldAccess(storage)
    expect(envelope.claims).toHaveLength(1)
    expect(envelope.claims[0].firstAccessedAt).toBe('2026-07-16T07:00:00.000Z')
    expect(envelope.claims[0].lastAccessedAt).toBe('2026-07-17T07:00:00.000Z')
  })

  it('migrates an existing retired machine claim to LD-001', () => {
    const storage = createMemoryStorage()
    storage.setItem(FIELD_ACCESS_STORAGE_KEY, JSON.stringify({
      version: 1,
      current: {
        edition: '06',
        token: '44ZSSL',
        objectType: 'field-access',
        machineId: 'bad-day-receipt',
        firstAccessedAt: '2026-07-15T07:00:00.000Z',
        lastAccessedAt: '2026-07-16T07:00:00.000Z',
      },
      claims: [{
        edition: '06',
        token: '44ZSSL',
        objectType: 'field-access',
        machineId: 'bad-day-receipt',
        firstAccessedAt: '2026-07-15T07:00:00.000Z',
        lastAccessedAt: '2026-07-16T07:00:00.000Z',
      }],
    }))

    const migrated = loadFieldAccess(storage)
    expect(migrated.current?.machineId).toBe('LD-001')
    expect(migrated.claims[0]?.machineId).toBe('LD-001')
  })

  it('recovers safely from malformed local state', () => {
    const storage = createMemoryStorage()
    storage.setItem(FIELD_ACCESS_STORAGE_KEY, '{not-json')
    expect(loadFieldAccess(storage)).toEqual({ version: 1, current: null, claims: [] })
  })
})
