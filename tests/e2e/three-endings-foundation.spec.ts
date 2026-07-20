import { expect, test } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const machineStorageKey = 'bad-day-receipt-machine-v1'
const foundationEnabled = process.env.VITE_THREE_ENDINGS === 'true'

test.describe('Three Endings foundation', () => {
  test.skip(!foundationEnabled, 'Three Endings foundation requires VITE_THREE_ENDINGS=true')

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('completed printing creates one pending receipt and restores it after refresh', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)

    await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', 'complete', {
      timeout: 20_000,
    })
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'SHARE', exact: true })).toHaveCount(0)

    const before = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }, machineStorageKey)

    expect(before?.version).toBe(2)
    expect(before?.data?.pendingReceipt?.receiptNumber).toBeTruthy()
    expect(before?.data?.history).toHaveLength(0)
    const receiptNumber = before.data.pendingReceipt.receiptNumber

    await page.reload()

    await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', 'complete')
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect(page.getByText(receiptNumber, { exact: true })).toBeVisible()

    const after = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }, machineStorageKey)

    expect(after?.data?.pendingReceipt?.receiptNumber).toBe(receiptNumber)
    expect(after?.data?.history).toHaveLength(0)
  })

  test('receipt persistence excludes Carry Forward task context', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeVisible({
      timeout: 20_000,
    })

    const serialized = await page.evaluate((key) => window.localStorage.getItem(key) ?? '', machineStorageKey)
    expect(serialized).not.toContain('composeDrafts')
    expect(serialized).not.toContain('User-provided source')
    expect(serialized).not.toContain('evidenceQuote')
  })
})
