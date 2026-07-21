import { expect, test } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const machineStorageKey = 'bad-day-receipt-machine-v1'
const foundationEnabled = process.env.VITE_THREE_ENDINGS === 'true'

test.describe('Three Endings shared decision', () => {
  test.skip(!foundationEnabled, 'Three Endings shared decision requires VITE_THREE_ENDINGS=true')

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('a completed print settles before exposing the documented decision', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)

    const machine = page.locator('.receipt-machine')
    await expect(machine).toHaveAttribute('data-phase', 'complete', { timeout: 20_000 })
    await expect(machine).toHaveAttribute('data-receipt-ending-state', 'settling')

    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /END THE DAY HERE/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /CARRY ONE THING FORWARD/ })).toHaveCount(0)

    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect(machine).toHaveAttribute('data-receipt-ending-state', 'documented')

    const choices = page.locator('[data-decision-choice]')
    await expect(choices).toHaveCount(2)
    await expect(choices.nth(0)).toHaveAttribute('class', 'receipt-decision__choice')
    await expect(choices.nth(1)).toHaveAttribute('class', 'receipt-decision__choice')

    await expect(page.getByText('THIS DAY REQUIRED MORE', { exact: true })).toBeVisible()
    await expect(page.getByText('THAN THE RECORD SHOWS.', { exact: true })).toBeVisible()
    await expect(page.getByText('DAY DOCUMENTED', { exact: true }).last()).toBeVisible()

    await expect(page.getByRole('button', { name: 'SHARE', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'REPRINT', exact: true })).toHaveCount(0)
    await expect(page.locator('.cf-machine-entry')).not.toBeVisible()
  })

  test('shared Release handoff and Carry designation preserve the exact receipt root', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })

    const receipt = page.locator('[data-receipt-artifact]')
    const originalReceipt = await receipt.elementHandle()
    expect(originalReceipt).toBeTruthy()

    const sameReceiptIsMounted = async () => originalReceipt?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-receipt-artifact]')
    ))

    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await expect(page.getByRole('heading', { name: 'How should the receipt leave your hands?' })).toBeFocused()
    expect(await sameReceiptIsMounted()).toBe(true)

    await page.getByRole('button', { name: /LET IT GO/ }).click()
    await expect(page.getByRole('heading', { name: 'The receipt is ready to be released.' })).toBeFocused()
    expect(await sameReceiptIsMounted()).toBe(true)
    await page.getByRole('button', { name: 'BACK', exact: true }).click()

    await page.getByRole('button', { name: 'BACK TO ENDING CHOICE', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()

    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
    expect(await sameReceiptIsMounted()).toBe(true)
    await page.getByRole('button', { name: 'NOTHING AFTER ALL' }).click()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    expect(await sameReceiptIsMounted()).toBe(true)
  })

  test('Keep selection begins the automatic ritual without another confirmation surface', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })

    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await page.getByRole('button', { name: /KEEP RECEIPT/ }).click()

    await expect(page.locator('.receipt-machine')).toHaveAttribute('data-receipt-ending-state', 'keep-ritual')
    await expect(page.locator('.receipt-machine')).toHaveAttribute('data-keep-phase', 'cut')
    await expect(page.getByText('PRESERVING THE RECORD', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'BACK', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'CONTINUE', exact: true })).toHaveCount(0)
  })

  test('refresh restores the exact pending receipt directly to documented', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })

    const before = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }, machineStorageKey)

    expect(before?.version).toBe(2)
    expect(before?.data?.pendingReceipt?.receiptNumber).toBeTruthy()
    expect(before?.data?.history).toHaveLength(0)
    const receiptNumber = before.data.pendingReceipt.receiptNumber

    await page.reload()

    await expect(page.locator('.receipt-machine')).toHaveAttribute('data-receipt-ending-state', 'documented')
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect(page.locator('[data-receipt-artifact]')).toHaveAttribute('data-receipt-number', receiptNumber)
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
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeVisible({ timeout: 20_000 })
    const serialized = await page.evaluate((key) => window.localStorage.getItem(key) ?? '', machineStorageKey)
    expect(serialized).not.toContain('composeDrafts')
    expect(serialized).not.toContain('User-provided source')
    expect(serialized).not.toContain('evidenceQuote')
  })

  test('direct Carry Forward remains separately addressable', async ({ page }) => {
    await page.goto('/carry-forward')
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeVisible()
  })
})
