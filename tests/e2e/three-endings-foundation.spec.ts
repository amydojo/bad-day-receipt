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

    const settlingSnapshotPromise = page.evaluate(() => new Promise<{
      state: string | null
      documentedHeadingPresent: boolean
      endDayChoicePresent: boolean
      carryChoicePresent: boolean
    }>((resolve) => {
      const machine = document.querySelector('.receipt-machine')
      if (!machine) throw new Error('RECEIPT_MACHINE_NOT_FOUND')

      const capture = () => {
        if (machine.getAttribute('data-receipt-ending-state') !== 'settling') return false
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        const buttons = Array.from(document.querySelectorAll('button'))
        resolve({
          state: machine.getAttribute('data-receipt-ending-state'),
          documentedHeadingPresent: headings.some((heading) => (
            heading.textContent?.trim() === 'The day is documented.'
          )),
          endDayChoicePresent: buttons.some((button) => (
            button.textContent?.includes('END THE DAY HERE')
          )),
          carryChoicePresent: buttons.some((button) => (
            button.textContent?.includes('CARRY ONE THING FORWARD')
          )),
        })
        return true
      }

      if (capture()) return
      const observer = new MutationObserver(() => {
        if (!capture()) return
        observer.disconnect()
      })
      observer.observe(machine, {
        attributes: true,
        attributeFilter: ['data-receipt-ending-state'],
        childList: true,
        subtree: true,
      })
    }))

    await commitTransaction(page)

    const machine = page.locator('.receipt-machine')
    const settlingSnapshot = await settlingSnapshotPromise
    expect(settlingSnapshot).toEqual({
      state: 'settling',
      documentedHeadingPresent: false,
      endDayChoicePresent: false,
      carryChoicePresent: false,
    })
    await expect(machine).toHaveAttribute('data-phase', 'complete', { timeout: 20_000 })

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

  test('Carry designation preserves the exact receipt root and returns without replaying stillness', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })

    const receipt = page.locator('[data-receipt-artifact]')
    const originalReceipt = await receipt.elementHandle()
    expect(originalReceipt).toBeTruthy()
    const sameReceiptIsMounted = async () => originalReceipt?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-receipt-artifact]')
    ))

    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
    expect(await sameReceiptIsMounted()).toBe(true)
    await page.getByRole('button', { name: 'NOTHING AFTER ALL' }).click()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    expect(await sameReceiptIsMounted()).toBe(true)
  })

  test('Keep and Release selections begin their automatic rituals without another confirmation', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })

    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await page.getByRole('button', { name: /LET IT GO/ }).click()
    await expect(page.locator('.receipt-machine')).toHaveAttribute('data-receipt-ending-state', 'release-ritual')
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
