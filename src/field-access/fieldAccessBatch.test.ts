import { describe, expect, it } from 'vitest'
import manifest from '../../artifacts/field-batch-001/manifest.json'
import { getFieldAccessConfig } from './fieldAccessConfig'

const tokenPattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

describe('FIELD–001 production manifest', () => {
  it('contains ten unique, internally consistent physical objects', () => {
    expect(manifest).toHaveLength(10)
    expect(new Set(manifest.map((row) => row.edition)).size).toBe(10)
    expect(new Set(manifest.map((row) => row.token)).size).toBe(10)
    expect(new Set(manifest.map((row) => row.url)).size).toBe(10)

    for (const row of manifest) {
      const config = getFieldAccessConfig(row.edition)
      expect(row.machine_id).toBe('LD-001')
      expect(row.token).toMatch(tokenPattern)
      expect(row.url).toBe(
        `https://bad-day-receipt.vercel.app/access/${row.edition}/${row.token}`,
      )
      expect(config).toMatchObject({
        edition: row.edition,
        objectName: row.card_name,
        objectType: row.object_type,
        objectClass: row.object_class,
        machineId: row.machine_id,
      })
    }
  })
})
