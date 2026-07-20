import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const machineStorageKey = 'bad-day-receipt-machine-v1'
const keepEnabled = process.env.VITE_THREE_ENDINGS === 'true'

async function reachKeep(page: Page) {
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

  await page.evaluate((storageKey) => {
    const browserWindow = window as Window & {
      __keepPhases?: string[]
      __keepArchiveWritePhases?: Array<string | null>
    }
    browserWindow.__keepPhases = []
    browserWindow.__keepArchiveWritePhases = []

    const machine = document.querySelector('.receipt-machine')
    const recordPhase = () => {
      const phase = machine?.getAttribute('data-keep-phase')
      if (phase && browserWindow.__keepPhases?.at(-1) !== phase) {
        browserWindow.__keepPhases?.push(phase)
      }
    }
    if (machine) {
      new MutationObserver(recordPhase).observe(machine, {
        attributes: true,
        attributeFilter: ['data-keep-phase'],
      })
    }

    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function observedSetItem(key: string, value: string) {
      if (key === storageKey) {
        try {
          const parsed = JSON.parse(value)
          if (parsed?.data?.privateArchive?.length > 0) {
            browserWindow.__keepArchiveWritePhases?.push(
              machine?.getAttribute('data-keep-phase') ?? null,
            )
          }
        } catch {
          // The product's persistence parser owns malformed-data handling.
        }
      }
      return originalSetItem.call(this, key, value)
    }
  }, machineStorageKey)

  await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
  await page.getByRole('button', { name: /KEEP RECEIPT/ }).click()

  return {
    receiptNumber: receiptNumber!,
    receiptHandle,
    printerHandle,
  }
}

async function readMachineStorage(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }, machineStorageKey)
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

test.describe('Keep Receipt archival ritual', () => {
  test.skip(!keepEnabled, 'Keep Receipt requires VITE_THREE_ENDINGS=true')
  test.setTimeout(45_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('preserves the same receipt and printer through K01–K06 and commits only after closure', async ({ page }) => {
    const { receiptNumber, receiptHandle, printerHandle } = await reachKeep(page)
    const machine = page.locator('.receipt-machine')

    await expect(machine).toHaveAttribute('data-keep-phase', 'cut')
    const duringCut = await readMachineStorage(page)
    expect(duringCut.data.privateArchive).toHaveLength(0)
    expect(duringCut.data.pendingReceipt.receiptNumber).toBe(receiptNumber)

    await expect(page.getByRole('heading', { name: 'Receipt kept with care.' })).toBeFocused({ timeout: 12_000 })
    await expect(machine).toHaveAttribute('data-keep-phase', 'complete')
    await expect(page.getByText(`Receipt ${receiptNumber} is stored privately.`, { exact: false })).toBeVisible()

    const observation = await page.evaluate(() => {
      const browserWindow = window as Window & {
        __keepPhases?: string[]
        __keepArchiveWritePhases?: Array<string | null>
      }
      return {
        phases: browserWindow.__keepPhases ?? [],
        archiveWritePhases: browserWindow.__keepArchiveWritePhases ?? [],
      }
    })
    expect(observation.phases).toEqual([
      'cut',
      'align',
      'sleeve-rising',
      'sleeve-receiving',
      'label-registering',
      'archive-opening',
      'archiving',
      'archive-closing',
      'complete',
    ])
    expect(observation.archiveWritePhases.length).toBeGreaterThan(0)
    expect(observation.archiveWritePhases.every((phase) => (
      phase === 'archive-closing' || phase === 'complete'
    ))).toBe(true)

    const stored = await readMachineStorage(page)
    expect(stored.data.privateArchive).toHaveLength(1)
    expect(stored.data.privateArchive[0].receipt.receiptNumber).toBe(receiptNumber)
    expect(stored.data.pendingReceipt).toBeNull()
    expect(stored.data.receiptDispositions).toEqual(expect.arrayContaining([
      expect.objectContaining({ receiptNumber, disposition: 'kept' }),
    ]))

    expect(await receiptHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-receipt-artifact]')
    ))).toBe(true)
    expect(await printerHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-printer-shell]')
    ))).toBe(true)
    await expect(page.getByRole('button', { name: 'SHARE', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'REPRINT', exact: true })).toHaveCount(0)
    await expectNoBlockingAxeViolations(page)
  })

  test('survives refresh and reopens the exact archived snapshot from Local Records', async ({ page }) => {
    const { receiptNumber } = await reachKeep(page)
    await expect(page.getByRole('heading', { name: 'Receipt kept with care.' })).toBeFocused({ timeout: 12_000 })
    const before = await readMachineStorage(page)
    const archived = before.data.privateArchive[0]

    await page.getByRole('button', { name: 'CLOSE', exact: true }).click()
    await page.reload()
    await page.getByRole('button', { name: /RECORDS/ }).click()

    await expect(page.getByRole('heading', { name: 'PRIVATE ARCHIVE' })).toBeVisible()
    await expect(page.getByRole('button', { name: `Open archived receipt ${receiptNumber}` })).toBeVisible()
    await page.getByRole('button', { name: `Open archived receipt ${receiptNumber}` }).click()

    await expect(page.getByRole('heading', { name: `Receipt ${receiptNumber}` })).toBeVisible()
    const archivedReceipt = page.locator(`[data-receipt-number="${receiptNumber}"]`)
    await expect(archivedReceipt).toContainText(receiptNumber)
    await expect(archivedReceipt).toContainText('THIS DAY REQUIRED MORE')
    await expect(archivedReceipt).toContainText('DAY DOCUMENTED')
    await expect(page.getByText(new Date(archived.receipt.completedAt).getFullYear().toString(), { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'COPY TEXT', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'EXPORT', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'SEND TO DOJO ARCHIVE', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'REPRINT', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /CARRY ONE THING FORWARD/ })).toHaveCount(0)
    await expectNoBlockingAxeViolations(page)
  })

  test('does not duplicate an archive entry when the completed state is revisited', async ({ page }) => {
    const { receiptNumber } = await reachKeep(page)
    await expect(page.getByRole('heading', { name: 'Receipt kept with care.' })).toBeVisible({ timeout: 12_000 })
    const first = await readMachineStorage(page)
    expect(first.data.privateArchive.filter((entry: { receipt: { receiptNumber: string } }) => (
      entry.receipt.receiptNumber === receiptNumber
    ))).toHaveLength(1)

    await page.waitForTimeout(500)
    const second = await readMachineStorage(page)
    expect(second.data.privateArchive.filter((entry: { receipt: { receiptNumber: string } }) => (
      entry.receipt.receiptNumber === receiptNumber
    ))).toHaveLength(1)
    expect(second.data.receiptDispositions.filter((entry: { receiptNumber: string }) => (
      entry.receiptNumber === receiptNumber
    ))).toHaveLength(1)
  })

  test('keeps the pending receipt valid when local archive persistence fails', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
    const before = await readMachineStorage(page)
    const receiptNumber = before.data.pendingReceipt.receiptNumber

    await page.evaluate((key) => {
      const original = Storage.prototype.setItem
      Object.defineProperty(window, '__restoreKeepStorage', {
        configurable: true,
        value: () => { Storage.prototype.setItem = original },
      })
      Storage.prototype.setItem = function setItem(storageKey: string, value: string) {
        if (storageKey === key) throw new DOMException('Quota unavailable', 'QuotaExceededError')
        return original.call(this, storageKey, value)
      }
    }, machineStorageKey)

    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await page.getByRole('button', { name: /KEEP RECEIPT/ }).click()
    await expect(page.getByRole('heading', { name: 'The receipt is still here.' })).toBeFocused({ timeout: 12_000 })
    await expect(page.getByText('Nothing has been lost.', { exact: false })).toBeVisible()
    await expect(page.getByText('stored privately', { exact: false })).toHaveCount(0)

    await page.evaluate(() => {
      const restore = (window as Window & { __restoreKeepStorage?: () => void }).__restoreKeepStorage
      restore?.()
    })

    const durableBeforeRetry = await readMachineStorage(page)
    expect(durableBeforeRetry.data.pendingReceipt.receiptNumber).toBe(receiptNumber)
    expect(durableBeforeRetry.data.privateArchive).toHaveLength(0)

    await page.getByRole('button', { name: /TRY PRIVATE ARCHIVE AGAIN/ }).click()
    await expect(page.getByRole('heading', { name: 'Receipt kept with care.' })).toBeFocused({ timeout: 8_000 })
    const afterRetry = await readMachineStorage(page)
    expect(afterRetry.data.pendingReceipt).toBeNull()
    expect(afterRetry.data.privateArchive).toHaveLength(1)
    expect(afterRetry.data.privateArchive[0].receipt.receiptNumber).toBe(receiptNumber)
  })

  test('refresh before successful commit returns to the documented pending receipt', async ({ page }) => {
    await reachKeep(page)
    await expect(page.locator('.receipt-machine')).toHaveAttribute('data-keep-phase', 'sleeve-rising', { timeout: 8_000 })
    await page.reload()

    await expect(page.locator('.receipt-machine')).toHaveAttribute('data-receipt-ending-state', 'documented')
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    const stored = await readMachineStorage(page)
    expect(stored.data.pendingReceipt).not.toBeNull()
    expect(stored.data.privateArchive).toHaveLength(0)
  })
})
