import { describe, expect, it } from 'vitest'
import { fieldAccessConfigs, getFieldAccessConfig, isKnownFieldEdition } from './fieldAccessConfig'

const expected = [
  ['01', 'Entrance Pass', 'entrance-pass', 'LD–ENTRANCE'],
  ['02', 'Public Test', 'public-test', 'LD–TEST'],
  ['03', 'Awake Machine', 'awake-machine', 'LD–AWAKE'],
  ['04', 'Human Subject', 'human-subject-pass', 'LD–SUBJECT'],
  ['05', 'Specimen Access', 'specimen-access', 'LD–SPECIMEN'],
  ['06', 'Field Access', 'field-access', 'LD–FIELD'],
  ['07', 'Recovered Artifact', 'recovered-artifact', 'LD–RECOVERED'],
  ['08', 'Operating Instructions', 'operating-instructions', 'LD–OPERATE'],
  ['09', 'Field Note', 'field-note', 'LD–NOTE'],
  ['10', 'Specimen Room', 'specimen-room', 'LD–ROOM'],
] as const

describe('field access edition registry', () => {
  it('registers all ten FIELD–001 editions to canonical LD–001', () => {
    expect(Object.keys(fieldAccessConfigs).sort()).toEqual(
      expected.map(([edition]) => edition).sort(),
    )
    for (const [edition, objectName, objectType, objectClass] of expected) {
      const config = getFieldAccessConfig(edition)
      expect(config).toMatchObject({
        edition,
        objectName,
        objectType,
        objectClass,
        machineId: 'LD-001',
        machineLabel: 'LD–001',
      })
      expect(isKnownFieldEdition(edition)).toBe(true)
    }
  })

  it('rejects unknown editions without falling back to another object', () => {
    expect(getFieldAccessConfig('00')).toBeNull()
    expect(getFieldAccessConfig('11')).toBeNull()
    expect(isKnownFieldEdition('99')).toBe(false)
  })
})
