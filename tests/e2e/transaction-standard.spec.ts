import { expect, test } from '@playwright/test'
import {
  commitTransaction,
  openMachine,
  selectOneAdditionalCharge,
  waitForComplete,
} from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

test.beforeEach(async ({ page }) => {
  await mockPlatformApis(page)
})

test('creates, finishes, copies, and resets a standard receipt', async ({ page }) => {
  await openMachine(page)
  const summary = page.locator('.hero-transaction strong')
  const before = await summary.textContent()

  await selectOneAdditionalCharge(page)
  await expect(summary).not.toHaveText(before ?? '')

  await commitTransaction(page)
  await expect(page.locator('.receipt-paper-leader')).toBeVisible()
  await waitForComplete(page)

  await page.getByRole('button', { name: 'COPY TEXT', exact: true }).click()
  await expect(page.getByText('COPIED TO CLIPBOARD')).toBeVisible()

  await page.getByRole('button', { name: 'NEW RECEIPT', exact: true }).click()
  await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', 'idle')
})

test('keeps rapid commit activation idempotent', async ({ page }) => {
  await openMachine(page)
  const button = page.getByTestId('mobile-commit')
  if (await button.isVisible()) {
    await button.click({ clickCount: 3, delay: 0 })
  } else {
    await page.getByRole('button', { name: 'RING IT UP', exact: true }).first().click({ clickCount: 3 })
  }
  await waitForComplete(page)
  await expect(page.locator('.post-print-panel')).toHaveCount(1)
})
