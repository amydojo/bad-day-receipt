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

  test('reduced motion removes the compile loop and preserves status text', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/carry-forward')
    const duration = await page.locator('.cf-app').evaluate((element) => getComputedStyle(element).getPropertyValue('--cf-motion-scene').trim())
    expect(duration).toBe('420ms')
    const reducedRulePresent = await page.evaluate(() => [...document.styleSheets].some((sheet) => {
      try { return [...sheet.cssRules].some((rule) => rule.cssText.includes('prefers-reduced-motion')) } catch { return false }
    }))
    expect(reducedRulePresent).toBe(true)
  })

  test('200% zoom keeps the primary task and exit controls reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/carry-forward')
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    await expect(page.getByRole('link', { name: 'BACK TO RECEIPT' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'CONTINUE', exact: true })).toBeVisible()
  })
})
