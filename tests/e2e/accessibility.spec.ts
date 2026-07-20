import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { commitTransaction, openMachine, waitForComplete } from '../fixtures/machine'

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  const violations = results.violations.filter((violation) => (
    violation.impact === 'serious' || violation.impact === 'critical'
  ))
  expect(violations).toEqual([])
}

test('input state has no serious or critical violations', async ({ page }) => {
  await openMachine(page)
  await expectNoSeriousViolations(page)
})

test('completed artifact remains accessible', async ({ page }) => {
  test.setTimeout(45_000)
  await openMachine(page)
  await commitTransaction(page)
  await waitForComplete(page)
  await expect(page.locator('article.receipt h2')).toBeVisible()
  await expectNoSeriousViolations(page)
})

test('drawers close with Escape and restore trigger focus', async ({ page }) => {
  await openMachine(page)
  const settings = page.getByRole('button', { name: /SETTINGS/ }).first()
  if (!(await settings.isVisible())) return

  await settings.click()
  await expect(page.getByRole('dialog', { name: 'Machine settings' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(settings).toBeFocused()
})
