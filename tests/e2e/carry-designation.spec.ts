import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'
const machineStorageKey = 'bad-day-receipt-machine-v1'

async function installCompilerGuard(page: Page) {
  await page.route('**/api/compile-task', async (route) => {
    await route.abort('blockedbyclient')
    throw new Error('COMPILER_CALLED_BEFORE_APPLY')
  })
}

async function assertNoBlockingAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.filter((violation) => (
    violation.impact === 'critical' || violation.impact === 'serious'
  ))).toEqual([])
}

async function reachReceiptDesignation(page: Page) {
  await openMachine(page)
  await commitTransaction(page)
  await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
  await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
  await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
}

async function designateManualTask(page: Page, task = 'Reply to the insurance denial') {
  await page.getByLabel('ONE REMAINING OBLIGATION').fill(task)
  await page.getByRole('button', { name: 'USE THIS ONE' }).click()
  await expect(page.getByRole('heading', { name: 'Give the task only what it needs.' })).toBeFocused()
}

test.describe('Carry Forward designation', () => {
  test.skip(!enabled, 'Designation requires VITE_THREE_ENDINGS=true')
  test.setTimeout(40_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
    await installCompilerGuard(page)
  })

  test('receipt-origin manual designation reaches ritual-ready without compiler or receipt-storage leakage', async ({ page }) => {
    await reachReceiptDesignation(page)
    await designateManualTask(page)

    await page.getByRole('button', { name: /ADD SOURCE TEXT OR CONTEXT/ }).click()
    await page.getByLabel('SOURCE TEXT OR CONTEXT').fill('Private denial letter source text')
    await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()

    await expect(page.getByRole('heading', { name: 'ONE THING MODE' })).toBeVisible()
    await expect(page.getByText('One active step', { exact: true })).toBeVisible()
    await expect(page.getByText('Nothing sent automatically', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()

    await expect(page.getByRole('heading', { name: 'The adjustment is ready to be issued.' })).toBeFocused()
    await expect(page.getByText('NOT CALLED', { exact: true })).toBeVisible()

    const receiptStorage = await page.evaluate((key) => window.localStorage.getItem(key) ?? '', machineStorageKey)
    expect(receiptStorage).not.toContain('Reply to the insurance denial')
    expect(receiptStorage).not.toContain('Private denial letter source text')
    expect(receiptStorage).not.toContain('InteractionBudget')
    await assertNoBlockingAxeViolations(page)
  })

  test('Nothing After All clears source state and returns to the same completed receipt', async ({ page }) => {
    await reachReceiptDesignation(page)
    const receiptHandle = await page.locator('[data-receipt-artifact]').elementHandle()
    const receiptNumber = await page.locator('[data-receipt-artifact]').getAttribute('data-receipt-number')
    await designateManualTask(page, 'Review the repair estimate')
    await page.getByRole('button', { name: /ADD SOURCE TEXT OR CONTEXT/ }).click()
    await page.getByLabel('SOURCE TEXT OR CONTEXT').fill('Temporary private context')
    await page.getByRole('button', { name: 'NOTHING AFTER ALL' }).click()

    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    expect(await receiptHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-receipt-artifact]')
    ))).toBe(true)
    await expect(page.locator('[data-receipt-artifact]')).toHaveAttribute('data-receipt-number', receiptNumber ?? '')
    const receiptStorage = await page.evaluate((key) => window.localStorage.getItem(key) ?? '', machineStorageKey)
    expect(receiptStorage).not.toContain('Review the repair estimate')
    expect(receiptStorage).not.toContain('Temporary private context')
  })

  test('Customize reuses the typed policy controls and returns focus', async ({ page }) => {
    await reachReceiptDesignation(page)
    await designateManualTask(page)
    await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()

    const customize = page.getByRole('button', { name: 'CUSTOMIZE' })
    await customize.focus()
    await customize.click()
    const dialog = page.getByRole('dialog', { name: 'Adjust what the task should ask less of' })
    await expect(dialog).toBeVisible()
    const fewer = dialog.getByRole('checkbox', { name: /Fewer decisions/ })
    await expect(fewer).toBeChecked()
    await fewer.uncheck()
    await dialog.getByRole('button', { name: 'APPLY CUSTOMIZATION' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(customize).toBeFocused()
  })

  test('direct route begins with manual input and stops before compilation', async ({ page }) => {
    await page.goto('/carry-forward')
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
    await designateManualTask(page, 'Prepare questions for the clinic')
    await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
    await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
    await expect(page.getByRole('heading', { name: 'The adjustment is ready to be issued.' })).toBeFocused()
    await expect(page.getByText('DIRECT ENTRY', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('NOT CALLED', { exact: true })).toBeVisible()
  })
})
