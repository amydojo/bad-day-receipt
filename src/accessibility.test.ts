import { describe, expect, it } from 'vitest'
import { themes } from './themes'
import { ACCESSIBILITY_TARGETS, contrastRatio } from './accessibility'

describe('accessibility contracts', () => {
  it('keeps every receipt theme ink above normal text contrast', () => {
    for (const theme of themes) {
      expect(
        contrastRatio(theme.palette.ink, theme.palette.paper),
        `${theme.id} ink on paper`,
      ).toBeGreaterThanOrEqual(ACCESSIBILITY_TARGETS.normalTextContrast)
    }
  })

  it('keeps primary touch targets at least 44 CSS pixels', () => {
    expect(ACCESSIBILITY_TARGETS.minimumTouchTarget).toBeGreaterThanOrEqual(44)
  })

  it('keeps reduced motion sequencing under 250 milliseconds', () => {
    expect(ACCESSIBILITY_TARGETS.maximumReducedMotionDuration).toBeLessThanOrEqual(250)
  })
})
