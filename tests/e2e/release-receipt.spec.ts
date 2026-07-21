import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const machineStorageKey = 'bad-day-receipt-machine-v1'
const releaseEnabled = process.env.VITE_THREE_ENDINGS === 'true'

async function readMachineStorage(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }, machineStorageKey)
}

async function reachRelease(page: Page) {
  await openMachine(page)
  await commitTransaction(page)
  await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })

  const receipt = page.locator('[data-receipt-artifact]')
  const printer = page.locator('[data-printer-shell]')
  const receiptNumber = await receipt.getAttribute('data-receipt-number')
  const receiptHandle = await receipt.elementHandle()
  const printerHandle = await printer.elementHandle()
  expect(receiptNumber).toBeTruthy()
  expect(receiptHandle).toBeTruthy()
  expect(printerHandle).toBeTruthy()

  await page.evaluate(() => {
    const browserWindow = window as Window & { __releasePhases?: string[] }
    browserWindow.__releasePhases = []
    const machine = document.querySelector('.receipt-machine')
    const record = () => {
      const phase = machine?.getAttribute('data-release-phase')
      if (phase && browserWindow.__releasePhases?.at(-1) !== phase) {
        browserWindow.__releasePhases?.push(phase)
      }
    }
    if (machine) {
      new MutationObserver(record).observe(machine, {
        attributes: true,
        attributeFilter: ['data-release-phase'],
      })
    }
  })

  await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
  await page.getByRole('button', { name: /LET IT GO/ }).click()

  return { receiptNumber: receiptNumber!, receiptHandle, printerHandle }
}

async function expectNoBlockingAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const blocking = results.violations.filter((violation) => (
    violation.impact === 'critical' || violation.impact === 'serious'
  ))
  expect(blocking, blocking.map((violation) => violation.id).join(', ')).toEqual([])
}

test.describe('Let It Go Release ritual', () => {
  test.skip(!releaseEnabled, 'Release requires VITE_THREE_ENDINGS=true')
  test.setTimeout(50_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('unprints in order, preserves one receipt and printer, then persists one Undo tombstone', async ({ page }) => {
    const { receiptNumber, receiptHandle, printerHandle } = await reachRelease(page)
    const machine = page.locator('.receipt-machine')

    await expect(page.getByRole('heading', { name: 'The day can end here.' })).toBeFocused({ timeout: 15_000 })
    await expect(machine).toHaveAttribute('data-release-phase', 'complete')
    await expect(page.getByRole('button', { name: 'UNDO RELEASE', exact: true })).toBeVisible()

    const phases = await page.evaluate(() => (
      (window as Window & { __releasePhases?: string[] }).__releasePhases ?? []
    ))
    expect(phases).toEqual([
      'cut',
      'unprint-total',
      'unprint-lines',
      'unprint-receipt-number',
      'unprint-acknowledgment',
      'soften',
      'slot-opening',
      'receiving',
      'corner-hold',
      'slot-closing',
      'committing',
      'complete',
    ])

    expect(await receiptHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-receipt-artifact]')
    ))).toBe(true)
    expect(await printerHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-printer-shell]')
    ))).toBe(true)
    await expect(page.locator('[data-receipt-artifact]')).toHaveCount(1)

    const stored = await readMachineStorage(page)
    expect(stored.data.pendingReceipt).toBeNull()
    expect(stored.data.pendingRelease.receipt.receiptNumber).toBe(receiptNumber)
    expect(stored.data.pendingRelease.undoUntil).toBeTruthy()
    expect(stored.data.receiptDispositions).toEqual(expect.arrayContaining([
      expect.objectContaining({ receiptNumber, disposition: 'released' }),
    ]))
    await expectNoBlockingAxeViolations(page)
  })

  test('Undo restores the exact pending receipt and survives a refresh inside the window', async ({ page }) => {
    const { receiptNumber } = await reachRelease(page)
    await expect(page.getByRole('heading', { name: 'The day can end here.' })).toBeFocused({ timeout: 15_000 })

    await page.reload()
    await expect(page.getByRole('heading', { name: 'The day can end here.' })).toBeFocused()
    await expect(page.getByRole('button', { name: 'UNDO RELEASE', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'UNDO RELEASE', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect(page.locator('[data-receipt-artifact]')).toHaveAttribute('data-receipt-number', receiptNumber)
    const stored = await readMachineStorage(page)
    expect(stored.data.pendingRelease).toBeNull()
    expect(stored.data.pendingReceipt.receiptNumber).toBe(receiptNumber)
  })

  test('storage failure preserves the visible receipt and retry remains idempotent', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
    const before = await readMachineStorage(page)
    const receiptNumber = before.data.pendingReceipt.receiptNumber

    await page.evaluate((key) => {
      const original = Storage.prototype.setItem
      Object.defineProperty(window, '__restoreReleaseStorage', {
        configurable: true,
        value: () => { Storage.prototype.setItem = original },
      })
      Storage.prototype.setItem = function setItem(storageKey: string, value: string) {
        if (storageKey === key) throw new DOMException('Quota unavailable', 'QuotaExceededError')
        return original.call(this, storageKey, value)
      }
    }, machineStorageKey)

    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await page.getByRole('button', { name: /LET IT GO/ }).click()
    await expect(page.getByRole('heading', { name: 'The receipt is still here.' })).toBeFocused({ timeout: 15_000 })
    await expect(page.getByText('Nothing has been removed.', { exact: false })).toBeVisible()

    await page.evaluate(() => {
      const restore = (window as Window & { __restoreReleaseStorage?: () => void }).__restoreReleaseStorage
      restore?.()
    })
    const durable = await readMachineStorage(page)
    expect(durable.data.pendingReceipt.receiptNumber).toBe(receiptNumber)
    expect(durable.data.pendingRelease).toBeNull()

    await page.getByRole('button', { name: /TRY RELEASE AGAIN/ }).click()
    await expect(page.getByRole('heading', { name: 'The day can end here.' })).toBeFocused({ timeout: 8_000 })
    const after = await readMachineStorage(page)
    expect(after.data.pendingReceipt).toBeNull()
    expect(after.data.pendingRelease.receipt.receiptNumber).toBe(receiptNumber)
  })

  test('an archived receipt can be released and Undo restores its original archive timestamp', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await page.getByRole('button', { name: /KEEP RECEIPT/ }).click()
    await expect(page.getByRole('heading', { name: 'Receipt kept with care.' })).toBeFocused({ timeout: 15_000 })
    const kept = await readMachineStorage(page)
    const entry = kept.data.privateArchive[0]

    await page.getByRole('button', { name: 'CLOSE', exact: true }).click()
    await page.getByRole('button', { name: /RECORDS/ }).click()
    await page.getByRole('button', { name: `Open archived receipt ${entry.receipt.receiptNumber}` }).click()
    await page.getByRole('button', { name: 'LET IT GO', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'The day can end here.' })).toBeFocused({ timeout: 15_000 })
    await page.getByRole('button', { name: 'UNDO RELEASE', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'PRIVATE ARCHIVE' })).toBeVisible()
    const restored = await readMachineStorage(page)
    expect(restored.data.pendingRelease).toBeNull()
    expect(restored.data.privateArchive[0].receipt.receiptNumber).toBe(entry.receipt.receiptNumber)
    expect(restored.data.privateArchive[0].archivedAt).toBe(entry.archivedAt)
  })
})
