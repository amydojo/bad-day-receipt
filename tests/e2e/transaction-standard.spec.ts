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
  const instrument = page.locator('.mobile-instrument')
  const isMobile = await instrument.getAttribute('data-mobile') === 'true'
  const summary = page.locator('.hero-transaction strong')
  const before = await summary.textContent()
  const bodyScrollBefore = await page.evaluate(() => window.scrollY)

  await selectOneAdditionalCharge(page)
  await expect(summary).not.toHaveText(before ?? '')

  await commitTransaction(page)
  await expect(instrument).toHaveAttribute('data-mobile-scene', 'printing')
  if (isMobile) expect(await page.evaluate(() => window.scrollY)).toBe(bodyScrollBefore)
  await expect(page.locator('.receipt-paper-leader')).toBeVisible()
  await waitForComplete(page)
  await expect(instrument).toHaveAttribute('data-mobile-scene', 'artifact')
  await expect(instrument).toHaveAttribute('data-scroll-owner', 'receipt')
  if (isMobile) expect(await page.evaluate(() => window.scrollY)).toBe(bodyScrollBefore)

  await page.getByRole('button', { name: 'MORE', exact: true }).click()
  const more = page.getByRole('dialog', { name: 'More evidence actions' })
  await more.getByRole('button', { name: /COPY TEXT/ }).click()
  await expect(more.getByText('COPIED TO CLIPBOARD')).toBeVisible()
  await more.getByRole('button', { name: /Close More evidence actions/ }).click()

  await page.getByRole('button', { name: 'NEW', exact: true }).click()
  await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', 'idle')
  await expect(instrument).toHaveAttribute('data-mobile-scene', 'compose')
  await expect(instrument).toHaveAttribute('data-scroll-owner', 'compose')
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
  await expect(page.locator('[data-evidence-viewer="true"]')).toHaveCount(1)
})
