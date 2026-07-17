import { describe, expect, it } from 'vitest'
import {
  FIELD_RELEASE_LABEL,
  FIELD_RELEASE_REGION,
  FIELD_RELEASE_TOTAL,
  fieldReleasePath,
  fieldReleaseStamp,
} from './fieldRelease'

describe('FIELD-001 collectible notation', () => {
  it('uses one canonical release stamp across every surface', () => {
    expect(FIELD_RELEASE_LABEL).toBe('FIELD–001')
    expect(FIELD_RELEASE_TOTAL).toBe(10)
    expect(FIELD_RELEASE_REGION).toBe('SOUTHERN CALIFORNIA')
    expect(fieldReleaseStamp('06')).toBe('FIELD–001 · OBJECT 06 / 10')
  })

  it('preserves physical object identity when opening the archive', () => {
    expect(fieldReleasePath('06', '44ZSSL', 'artifact-logged')).toBe(
      '/field/001?edition=06&token=44ZSSL&source=artifact-logged',
    )
  })

  it('allows the public board to open without a physical object context', () => {
    expect(fieldReleasePath()).toBe('/field/001?source=field-object')
  })
})
