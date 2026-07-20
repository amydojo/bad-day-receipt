import { describe, expect, it } from 'vitest'
import { resolveThreeEndingsEnabled } from './threeEndingsFeature'

describe('resolveThreeEndingsEnabled', () => {
  it('enables only the explicit true string', () => {
    expect(resolveThreeEndingsEnabled('true')).toBe(true)
    expect(resolveThreeEndingsEnabled('false')).toBe(false)
    expect(resolveThreeEndingsEnabled(undefined)).toBe(false)
    expect(resolveThreeEndingsEnabled(true)).toBe(false)
  })
})
