import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { mockPlatformApis } from '../fixtures/platformApis'

const accessPath = '/access/07/K7PM4A'

test.describe('Lab Dojo field access ritual', () => {
  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('uses a found object to unlock the existing receipt machine', async ({ page }) => {
    await page.goto(accessPath)

    await expect(page.locator('.field-access-terminal')).toBeVisible()
    await expect(page.getByText('LD–RECOVERED')).toBeVisible()
    await expect(page.getByRole('button', { name: 'INSERT ARTIFACT' })).toBeVisible()

    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()
    await expect(page.getByRole('heading', { name: /BAD DAY RECEIPT/ })).toBeVisible()
    await page.getByRole('button', { name: 'BEGIN OPERATION' }).click()

    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
    await expect(page.locator('.field-access-provenance')).toContainText('LD–07 / K7PM4A')

    const stored = await page.evaluate(() => localStorage.getItem('labdojo-field-access-v1'))
    expect(stored).toContain('K7PM4A')
  })

  test('recognizes a previously accepted object after refresh', async ({ page }) => {
    await page.goto(accessPath)
    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()
    await page.getByRole('button', { name: 'BEGIN OPERATION' }).click()
    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()

    await page.reload()
    await expect(page.locator('.field-access-terminal')).toHaveAttribute('data-returning', 'true')
    await expect(page.getByRole('button', { name: 'INSERT ARTIFACT' })).toBeVisible()
  })

  test('preserves the ritual without simulated motion when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(accessPath)
    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()
    await page.getByRole('button', { name: 'BEGIN OPERATION' }).click()
    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
  })

  test('fails unknown objects gracefully', async ({ page }) => {
    await page.goto('/access/99/K7PM4A')
    await expect(page.getByRole('heading', { name: /UNKNOWN FIELD OBJECT/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'OPEN SM–001 WITHOUT FIELD ACCESS' })).toBeVisible()
  })

  test('has no serious automated accessibility violations at the user-controlled insertion state', async ({ page }) => {
    await page.goto(accessPath)
    await expect(page.getByRole('button', { name: 'INSERT ARTIFACT' })).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const blocking = results.violations.filter((violation) => (
      violation.impact === 'critical' || violation.impact === 'serious'
    ))

    expect(blocking, blocking.map((violation) => violation.id).join(', ')).toEqual([])
  })
})
