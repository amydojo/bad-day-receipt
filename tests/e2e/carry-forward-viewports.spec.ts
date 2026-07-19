import { expect, test } from '@playwright/test'

const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]

test.describe('Carry Forward viewport gate', () => {
  for (const viewport of viewports) {
    test(`${viewport.width}x${viewport.height} has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/carry-forward')
      await expect(page.locator('.cf-app')).toBeVisible()
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }))
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1)
    })
  }
})
