import { describe, expect, it } from 'vitest'
import { makeFieldAccessPath, parseFieldAccessRoute } from './fieldAccessRoute'

describe('field access route parsing', () => {
  it('leaves normal machine routes untouched', () => {
    expect(parseFieldAccessRoute('/')).toEqual({ kind: 'root' })
    expect(parseFieldAccessRoute('/anything-else')).toEqual({ kind: 'root' })
  })

  it('reads edition and token from a physical object route', () => {
    expect(parseFieldAccessRoute('/access/07/k7pm4a')).toEqual({
      kind: 'access',
      edition: '07',
      token: 'K7PM4A',
    })
  })

  it('allows a trailing slash without changing the object', () => {
    expect(parseFieldAccessRoute('/access/07/K7PM4A/')).toEqual({
      kind: 'access',
      edition: '07',
      token: 'K7PM4A',
    })
  })

  it('rejects malformed editions and tokens gracefully', () => {
    expect(parseFieldAccessRoute('/access/7/K7PM4A')).toEqual({ kind: 'invalid', reason: 'edition' })
    expect(parseFieldAccessRoute('/access/07/no spaces')).toEqual({ kind: 'invalid', reason: 'token' })
    expect(parseFieldAccessRoute('/access/07')).toEqual({ kind: 'invalid', reason: 'shape' })
  })

  it('creates stable QR paths', () => {
    expect(makeFieldAccessPath('07', 'k7pm4a')).toBe('/access/07/K7PM4A')
  })
})
