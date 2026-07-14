import { expect, test } from '@playwright/test'
import { openMachine } from '../fixtures/machine'

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]

for (const viewport of viewports) {
  test(`layout ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openMachine(page)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    if (viewport.width < 768) {
      const commit = page.getByTestId('mobile-commit')
      if (await commit.isVisible()) {
        const box = await commit.boundingBox()
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      }
    } else {
      await expect(page.locator('.workspace')).toBeVisible()
    }
  })
}
