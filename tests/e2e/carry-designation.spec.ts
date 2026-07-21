import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'
const machineStorageKey = 'bad-day-receipt-machine-v1'
const carryStorageKey = 'bad-day-receipt:carry-forward:v1'

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

async function reachReceiptDesignation(
  page: Page,
  fixture?: 'single' | 'multiple',
) {
  if (fixture) {
    await page.goto(`/?carry-designation-fixture=${fixture}`)
    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
  } else {
    await openMachine(page)
  }
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

function activeFallbackRecord() {
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  return {
    version: 1,
    status: 'fallback',
    task: 'Reply to the landlord',
    budget: {
      version: 1,
      budgetId: 'budget-existing',
      taskId: 'task-existing',
      declaredBy: 'user',
      receiptId: null,
      createdAt,
      expiresAt,
      policies: {
        oneStepAtATime: true,
        fewerDecisions: true,
        protectProgress: true,
        deferOptionalWork: true,
      },
      invariants: {
        supportedStepKinds: ['read', 'choice', 'compose', 'checklist', 'review'],
        maxSteps: 5,
        outputActions: ['copy', 'download'],
      },
    },
    reason: 'offline',
    manualItems: [''],
    manualDraft: '',
  }
}

test.describe('Carry Forward designation', () => {
  test.skip(!enabled, 'Designation requires VITE_THREE_ENDINGS=true')
  test.setTimeout(40_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
    await installCompilerGuard(page)
  })

  test('receipt-origin explicit suggestion requires confirmation', async ({ page }) => {
    await reachReceiptDesignation(page, 'single')
    await expect(page.getByText('POSSIBLE REMAINING THING', { exact: true })).toBeVisible()
    await expect(page.getByText('Reply to the insurance denial', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'THIS ONE' }).click()
    await expect(page.getByRole('heading', { name: 'Give the task only what it needs.' })).toBeFocused()
    await expect(page.getByText('Reply to the insurance denial', { exact: true })).toBeVisible()
  })

  test('several explicit obligations remain unselected until the user chooses one', async ({ page }) => {
    await reachReceiptDesignation(page, 'multiple')
    const choices = page.getByRole('radio')
    await expect(choices).toHaveCount(2)
    await expect(choices.nth(0)).not.toBeChecked()
    await expect(choices.nth(1)).not.toBeChecked()
    await choices.nth(1).click()
    await expect(page.getByRole('heading', { name: 'Give the task only what it needs.' })).toBeFocused()
    await expect(page.getByText('Prepare questions for the clinic', { exact: true })).toBeVisible()
  })

  test('receipt-origin manual designation reaches ritual-ready without compiler or receipt-storage leakage', async ({ page }) => {
    const telemetryPayloads: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/_vercel/insights')) telemetryPayloads.push(request.postData() ?? '')
    })

    await reachReceiptDesignation(page)
    await expect(page.getByRole('button', { name: 'SHARE', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'REPRINT', exact: true })).toHaveCount(0)
    await designateManualTask(page)

    const sourceToggle = page.getByRole('button', { name: /ADD SOURCE TEXT OR CONTEXT/ })
    await sourceToggle.click()
    await page.getByLabel('SOURCE TEXT OR CONTEXT').fill('Private denial letter source text')
    await sourceToggle.click()
    await expect(sourceToggle).toBeFocused()
    await sourceToggle.click()
    await expect(page.getByLabel('SOURCE TEXT OR CONTEXT')).toHaveValue('Private denial letter source text')
    await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()

    await expect(page.getByRole('heading', { name: 'ONE THING MODE' })).toBeVisible()
    await expect(page.getByText('One active step', { exact: true })).toBeVisible()
    await expect(page.getByText('Nothing sent automatically', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()

    await expect(page.getByRole('heading', { name: 'The adjustment is ready to be issued.' })).toBeFocused()
    await expect(page.getByText('NOT CALLED', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'REVIEW ADJUSTMENT' })).toBeVisible()

    const receiptStorage = await page.evaluate((key) => window.localStorage.getItem(key) ?? '', machineStorageKey)
    expect(receiptStorage).not.toContain('Reply to the insurance denial')
    expect(receiptStorage).not.toContain('Private denial letter source text')
    expect(receiptStorage).not.toContain('InteractionBudget')
    expect(JSON.stringify(telemetryPayloads)).not.toContain('Reply to the insurance denial')
    expect(JSON.stringify(telemetryPayloads)).not.toContain('Private denial letter source text')
    await assertNoBlockingAxeViolations(page)
  })

  test('Nothing After All works before source, after source, and from the preset', async ({ page }) => {
    await reachReceiptDesignation(page)
    await page.getByRole('button', { name: 'NOTHING AFTER ALL' }).click()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()

    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
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

    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
    await designateManualTask(page, 'Prepare questions for the clinic')
    await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
    await page.getByRole('button', { name: 'NOTHING AFTER ALL' }).click()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()

    const receiptStorage = await page.evaluate((key) => window.localStorage.getItem(key) ?? '', machineStorageKey)
    expect(receiptStorage).not.toContain('Review the repair estimate')
    expect(receiptStorage).not.toContain('Temporary private context')
    expect(receiptStorage).not.toContain('Prepare questions for the clinic')
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

  test('feature-enabled direct route preserves an existing temporary Carry Forward session', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    }, { key: carryStorageKey, value: activeFallbackRecord() })

    await page.goto('/carry-forward')
    await expect(page.getByRole('heading', { name: 'You appear to be offline' })).toBeFocused()
    await expect(page.getByText('SAFE MANUAL FALLBACK', { exact: true })).toBeVisible()
  })
})
