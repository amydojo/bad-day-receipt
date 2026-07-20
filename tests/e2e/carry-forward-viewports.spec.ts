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

  test('reduced motion makes authored transitions effectively immediate', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/carry-forward')
    const sceneDuration = await page.locator('.cf-authored-scene').evaluate((element) => getComputedStyle(element).animationDuration)
    expect(sceneDuration).toBe('0.001s')
    const reducedRulePresent = await page.evaluate(() => [...document.styleSheets].some((sheet) => {
      try { return [...sheet.cssRules].some((rule) => rule.cssText.includes('prefers-reduced-motion')) } catch { return false }
    }))
    expect(reducedRulePresent).toBe(true)
  })

  test('reduced motion preserves rapid state changes and focus clarity', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/carry-forward')
    await page.getByLabel('WHAT STILL NEEDS DOING?').fill('Reply to the landlord about the repair')
    await page.getByRole('button', { name: /ADD TASK CONTEXT/ }).click()
    await expect(page.getByRole('heading', { name: 'Give the task only what it needs.' })).toBeFocused()
    await page.getByRole('button', { name: 'BACK' }).click()
    await expect(page.getByLabel('WHAT STILL NEEDS DOING?')).toBeFocused()
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M02')
  })

  test('200% zoom keeps the primary task and exit controls reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/carry-forward')
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    await expect(page.getByRole('button', { name: 'CANCEL' })).toBeVisible()
    await expect(page.getByRole('button', { name: /ADD TASK CONTEXT/ })).toBeVisible()
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }))
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1)
  })
})
