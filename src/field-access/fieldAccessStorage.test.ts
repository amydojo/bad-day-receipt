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
  it('claims a physical object and remembers it as the current access key', () => {
    const storage = createMemoryStorage()
    const config = getFieldAccessConfig('07')
    expect(config).not.toBeNull()
    if (!config) return

    const claim = claimFieldAccess(
      config,
      'k7pm4a',
      storage,
      new Date('2026-07-16T07:00:00.000Z'),
    )

    expect(claim.token).toBe('K7PM4A')
    expect(getCurrentFieldAccess(storage)).toEqual(claim)
    expect(isRecognizedFieldAccess('07', 'K7PM4A', storage)).toBe(true)
  })

  it('updates last access without duplicating the same object', () => {
    const storage = createMemoryStorage()
    const config = getFieldAccessConfig('07')
    if (!config) throw new Error('Missing field object 07 config')

    claimFieldAccess(config, 'K7PM4A', storage, new Date('2026-07-16T07:00:00.000Z'))
    claimFieldAccess(config, 'K7PM4A', storage, new Date('2026-07-17T07:00:00.000Z'))

    const envelope = loadFieldAccess(storage)
    expect(envelope.claims).toHaveLength(1)
    expect(envelope.claims[0].firstAccessedAt).toBe('2026-07-16T07:00:00.000Z')
    expect(envelope.claims[0].lastAccessedAt).toBe('2026-07-17T07:00:00.000Z')
  })

  it('recovers safely from malformed local state', () => {
    const storage = createMemoryStorage()
    storage.setItem(FIELD_ACCESS_STORAGE_KEY, '{not-json')
    expect(loadFieldAccess(storage)).toEqual({ version: 1, current: null, claims: [] })
  })
})
