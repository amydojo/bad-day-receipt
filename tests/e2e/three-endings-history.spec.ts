import { expect, test } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

test.describe('Three Endings browser history', () => {
  test.skip(!enabled, 'History parity requires VITE_THREE_ENDINGS=true')
  test.setTimeout(45_000)

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockPlatformApis(page)
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
  })

  test('back and forward move between documented and End Here without losing the receipt', async ({ page }) => {
    const receiptNumber = await page.locator('[data-receipt-artifact]').getAttribute('data-receipt-number')
    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await expect(page.getByRole('heading', { name: 'How should the receipt leave your hands?' })).toBeFocused()

    await page.goBack()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect(page.locator('[data-receipt-artifact]')).toHaveAttribute('data-receipt-number', receiptNumber ?? '')

    await page.goForward()
    await expect(page.getByRole('heading', { name: 'How should the receipt leave your hands?' })).toBeFocused()
    await expect(page.locator('[data-receipt-artifact]')).toHaveAttribute('data-receipt-number', receiptNumber ?? '')
  })

  test('back and forward move between documented and Carry designation without false navigation', async ({ page }) => {
    const url = page.url()
    const receiptNumber = await page.locator('[data-receipt-artifact]').getAttribute('data-receipt-number')
    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
    expect(page.url()).toBe(url)

    await page.goBack()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect(page.locator('[data-receipt-artifact]')).toHaveAttribute('data-receipt-number', receiptNumber ?? '')

    await page.goForward()
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
    expect(page.url()).toBe(url)
  })
})
