import { expect, test, type Page } from '@playwright/test'
import {
  INSURANCE_DENIAL_SOURCE,
  INSURANCE_DENIAL_TASK,
  createInsuranceDenialPlan,
} from '../../src/carry-forward/fixtures'
import { mockCarryForwardCompiler } from '../fixtures/carryForward'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'
const storageKey = 'bad-day-receipt:carry-forward:v1'

async function reachIssuedTransfer(page: Page) {
  await openMachine(page)
  await commitTransaction(page)
  await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
  await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
  await page.getByLabel('ONE REMAINING OBLIGATION').fill(INSURANCE_DENIAL_TASK)
  await page.getByRole('button', { name: 'USE THIS ONE' }).click()
  await page.getByRole('button', { name: 'ADD SOURCE TEXT OR CONTEXT' }).click()
  await page.getByLabel('SOURCE TEXT OR CONTEXT').fill(INSURANCE_DENIAL_SOURCE)
  await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
  await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
  await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
  await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
  await page.getByRole('button', { name: 'Push actuator to convert' }).click()
  await expect(page.locator('[data-field-transfer-issued="true"]')).toBeVisible({ timeout: 10_000 })
}

async function applyTransfer(page: Page) {
  await page.getByRole('button', { name: 'APPLY' }).click()
  await expect(page.locator('[data-field-transfer-status="applying"]')).toBeVisible()
}

async function completeRuntime(page: Page) {
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('radio', { name: /Member portal/ }).check()
  await page.getByRole('button', { name: /SHOW ALL CHOICES/ }).click()
  await page.getByRole('button', { name: 'Confirm choice', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Copy of the denial letter' }).check()
  await page.getByRole('checkbox', { name: 'Supporting medical records' }).check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await page.getByRole('button', { name: 'Close this task', exact: true }).click()
}

test.describe('Carry Forward in-tree compiler and runtime integration', () => {
  test.skip(!enabled, 'In-tree Carry Forward requires VITE_THREE_ENDINGS=true')
  test.setTimeout(90_000)

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockPlatformApis(page)
  })

  test('Apply reuses the trusted compiler and runtime without unmounting the receipt tree', async ({ page }) => {
    await mockCarryForwardCompiler(page)
    await reachIssuedTransfer(page)
    const receiptHandle = await page.locator('[data-receipt-artifact]').elementHandle()
    const printerHandle = await page.locator('[data-printer-shell]').elementHandle()
    const initialPath = new URL(page.url()).pathname

    await applyTransfer(page)
    await expect(page.getByRole('heading', { name: /Preparing the minimum/ })).toBeFocused()
    await expect(page.getByText('GOAL IDENTIFIED', { exact: true })).toBeVisible()
    await expect(page.getByText('Nothing is sent automatically.', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pin the deadline' })).toBeVisible({ timeout: 15_000 })

    expect(new URL(page.url()).pathname).toBe(initialPath)
    expect(await receiptHandle?.evaluate((node) => node.isConnected && node === document.querySelector('[data-receipt-artifact]'))).toBe(true)
    expect(await printerHandle?.evaluate((node) => node.isConnected && node === document.querySelector('[data-printer-shell]'))).toBe(true)
    await expect(page.locator('[data-field-transfer-status="applied"]')).toBeVisible()
    await expect(page.getByText('FT 027 APPLIED', { exact: true })).toBeVisible()

    const stored = await page.evaluate((key) => window.localStorage.getItem(key) ?? '', storageKey)
    expect(stored).toContain(INSURANCE_DENIAL_TASK)
    expect(stored).not.toContain(INSURANCE_DENIAL_SOURCE)
  })

  test('Cancel during compilation returns to the issued transfer and ignores a late response', async ({ page }) => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/api/compile-task', async (route) => {
      await gate
      try {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            plan: createInsuranceDenialPlan(),
            meta: { model: 'gpt-5.6-test', repaired: false },
          }),
        })
      } catch {
        // The cancelled request may already be closed by the browser.
      }
    })

    await reachIssuedTransfer(page)
    await applyTransfer(page)
    await page.getByRole('button', { name: 'CANCEL APPLY' }).click()
    await expect(page.locator('[data-field-transfer-issued="true"]')).toBeVisible()
    await expect(page.locator('[data-field-transfer-status="applying"]')).toHaveCount(0)
    release()
    await page.waitForTimeout(150)
    await expect(page.getByRole('heading', { name: 'Pin the deadline' })).toHaveCount(0)
    expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toBeNull()
  })

  test('invalid model output fails closed into the existing manual recovery', async ({ page }) => {
    await page.route('**/api/compile-task', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: { title: 'Unvalidated text must not render' },
          meta: { model: 'gpt-5.6-test', repaired: false },
        }),
      })
    })

    await reachIssuedTransfer(page)
    await page.getByRole('button', { name: 'APPLY' }).click()
    await expect(page.getByRole('heading', { name: 'The plan did not pass validation' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Nothing partial was used', { exact: true })).toBeVisible()
    await expect(page.getByText('Unvalidated text must not render')).toHaveCount(0)
  })

  test('refresh restores the validated active runtime inside the matching completed receipt', async ({ page }) => {
    await mockCarryForwardCompiler(page)
    await reachIssuedTransfer(page)
    await applyTransfer(page)
    await expect(page.getByRole('heading', { name: 'Pin the deadline' })).toBeVisible({ timeout: 15_000 })

    await page.reload()

    await expect(page.getByRole('heading', { name: 'Pin the deadline' })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('[data-receipt-artifact]')).toBeVisible()
    await expect(page.locator('[data-printer-shell]')).toBeVisible()
    await expect(page.locator('[data-field-transfer-status="applied"]')).toBeVisible()
  })

  test('completion clears temporary task context and returns to the documented receipt', async ({ page }) => {
    await mockCarryForwardCompiler(page)
    await reachIssuedTransfer(page)
    await applyTransfer(page)
    await expect(page.getByRole('heading', { name: 'Pin the deadline' })).toBeVisible({ timeout: 15_000 })

    await completeRuntime(page)
    await expect(page.getByRole('heading', { name: 'One thing closed.' })).toBeVisible()
    await expect(page.getByText(/did not send, submit, file, approve, or resolve/)).toBeVisible()
    await page.getByRole('button', { name: 'RETURN TO RECEIPT' }).click()

    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect(page.locator('[data-receipt-artifact]')).toBeVisible()
    expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toBeNull()
  })

  test('direct route remains truthful and does not invent receipt continuity', async ({ page }) => {
    await page.goto('/carry-forward')
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeVisible()
    await expect(page.getByLabel('ONE REMAINING OBLIGATION')).toBeVisible()
    await expect(page.locator('[data-receipt-artifact]')).toHaveCount(0)
    await expect(page.getByText('FT 027 APPLIED', { exact: true })).toHaveCount(0)
    await expect(page).toHaveURL(/\/carry-forward$/)
  })
})
