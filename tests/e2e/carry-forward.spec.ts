import { expect, test } from '@playwright/test'
import { INSURANCE_DENIAL_SOURCE } from '../../src/carry-forward/fixtures'
import { compileCarryForwardDemo, mockCarryForwardCompiler, openCarryForwardPreview } from '../fixtures/carryForward'

test.describe('Carry Forward vertical slice', () => {
  test.beforeEach(async ({ page }) => {
    await mockCarryForwardCompiler(page)
  })

  test('is directly reachable from the existing receipt machine', async ({ page }) => {
    await page.goto('/')
    const entry = page.getByRole('link', { name: 'CARRY ONE THING FORWARD' })
    await expect(entry).toBeVisible()
    await expect(entry).toHaveAttribute('href', '/carry-forward')
    await entry.click()
    await expect(page).toHaveURL(/\/carry-forward$/)
    await expect(page.getByRole('heading', { name: 'What needs to get done?' })).toBeVisible()
  })

  test('completes the canonical insurance-denial plan through deterministic renderers', async ({ page }) => {
    await compileCarryForwardDemo(page)

    const stored = await page.evaluate(() => window.localStorage.getItem('bad-day-receipt:carry-forward:v1'))
    expect(stored).not.toContain(INSURANCE_DENIAL_SOURCE)
    await expect(page.getByText('August 12, 2026', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'COMPLETE STEP' }).click()
    await expect(page.getByRole('heading', { name: 'Choose a submission route' })).toBeVisible()
    await expect(page.getByText('Mail', { exact: true })).toHaveCount(0)
    await page.getByRole('radio', { name: /Member portal/ }).check()
    await page.getByRole('button', { name: 'SHOW ALL CHOICES' }).click()
    await expect(page.getByText('Mail', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'COMPLETE STEP' }).click()

    await page.getByRole('checkbox', { name: 'Copy of the denial letter' }).check()
    await page.getByRole('checkbox', { name: 'Supporting medical records' }).check()
    await page.getByRole('button', { name: 'COMPLETE STEP' }).click()

    const draft = page.getByLabel(/State what decision you are appealing/)
    await expect(draft).toHaveValue(/Reference IR-48291/)
    await page.getByRole('button', { name: 'COMPLETE STEP' }).click()

    await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible()
    await page.getByRole('button', { name: 'FINISH PLAN' }).click()

    await expect(page.getByText('PLAN COMPLETE · M12')).toBeVisible()
    await expect(page.getByText('Follow up with Member Services')).toBeVisible()
    await page.getByRole('button', { name: 'COMPLETE PLAN & WHY' }).click()
    await expect(page.getByRole('dialog', { name: 'Complete plan & why' })).toBeVisible()
    await expect(page.getByText('EXACT EVIDENCE')).toBeVisible()
    await page.getByRole('button', { name: 'CLOSE' }).click()
  })

  test('fails closed when the server envelope contains an unvalidated plan', async ({ page }) => {
    await page.unroute('**/api/compile-task')
    await page.route('**/api/compile-task', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: { title: 'Raw unsafe output', steps: [], html: '<iframe>' },
          meta: { model: 'untrusted', repaired: false },
        }),
      })
    })
    await openCarryForwardPreview(page)
    await page.getByRole('button', { name: 'COMPILE TASK PLAN' }).click()
    await expect(page.getByRole('heading', { name: 'The plan did not pass validation' })).toBeVisible()
    await expect(page.getByText('Raw unsafe output')).toHaveCount(0)
    await expect(page.getByText('<iframe>')).toHaveCount(0)
  })

  test('recovers from ambiguous input without losing it', async ({ page }) => {
    await page.goto('/carry-forward')
    await page.getByLabel('ONE CONCRETE TASK').fill('Deal with that thing')
    await page.getByRole('button', { name: 'CONTINUE', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Name the concrete thing you want to finish.')
    await expect(page.getByLabel('ONE CONCRETE TASK')).toHaveValue('Deal with that thing')
  })
})
