import { expect, test } from '@playwright/test'
import { mockPlatformApis } from '../fixtures/platformApis'
import {
  expectNoHorizontalOverflow,
  expectScrollOwner,
  expectViewportLocked,
  mobileInstrument,
} from '../fixtures/qualityAssertions'

const viewports = [
  { label: 'compact phone', width: 320, height: 568, mobile: true },
  { label: 'small iPhone', width: 375, height: 667, mobile: true },
  { label: 'modern iPhone', width: 390, height: 844, mobile: true },
  { label: 'Android reference', width: 393, height: 852, mobile: true },
  { label: 'large phone', width: 430, height: 932, mobile: true },
  { label: 'mobile landscape', width: 667, height: 375, mobile: true },
  { label: 'tablet boundary', width: 768, height: 1024, mobile: false },
  { label: 'desktop workbench', width: 1440, height: 900, mobile: false },
] as const

test.describe('@viewport intentional viewport matrix', () => {
  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  for (const viewport of viewports) {
    test(`${viewport.label} · ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')

      const instrument = mobileInstrument(page)
      await expect(instrument).toBeVisible()
      await expect(instrument).toHaveAttribute('data-mobile', String(viewport.mobile))
      await expectNoHorizontalOverflow(page)

      const bounds = await instrument.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        }
      })

      expect(bounds.left).toBeGreaterThanOrEqual(-1)
      expect(bounds.top).toBeGreaterThanOrEqual(-1)
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1)

      if (viewport.mobile) {
        expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight + 1)
        await expectScrollOwner(page, 'compose')
        await expectViewportLocked(page)
        await expect(page.getByTestId('mobile-commit')).toBeVisible()
      } else {
        const bodyPosition = await page.evaluate(() => getComputedStyle(document.body).position)
        expect(bodyPosition).not.toBe('fixed')
        await expect(page.locator('.brand-lockup')).toBeVisible()
      }
    })
  }
})
