import { mkdir } from 'node:fs/promises'
import { URL } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { commitTransaction, openMachine } from '../fixtures/machine'

const screenshotDirectory = 'test-results/production-smoke/screenshots'
const legacyToolbarActions = ['SHARE', 'SAVE', 'ADD TO DOJO ARCHIVE', 'MORE', 'NEW'] as const

async function clearBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.goto('/')
  await page.evaluate(async () => {
    window.localStorage.clear()
    window.sessionStorage.clear()

    const registrations = await navigator.serviceWorker?.getRegistrations?.() ?? []
    await Promise.all(registrations.map((registration) => registration.unregister()))
  })
}

async function capture(page: Page, name: string): Promise<void> {
  await mkdir(screenshotDirectory, { recursive: true })
  await page.screenshot({
    path: `${screenshotDirectory}/${name}.png`,
    fullPage: true,
  })
}

async function expectNoLegacyToolbar(page: Page): Promise<void> {
  for (const action of legacyToolbarActions) {
    await expect(page.getByRole('button', { name: action, exact: true })).toHaveCount(0)
  }
}

async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const blocking = results.violations.filter((violation) => (
    violation.impact === 'critical' || violation.impact === 'serious'
  ))

  expect(blocking, blocking.map((violation) => (
    `${violation.id}: ${violation.help}\n${violation.nodes.map((node) => node.target.join(' ')).join('\n')}`
  )).join('\n\n')).toEqual([])
}

test('live production exposes the documented Three Endings decision and truthful direct entry', async ({ page }) => {
  const configuredBaseURL = process.env.PRODUCTION_BASE_URL
  if (!configuredBaseURL) throw new Error('PRODUCTION_BASE_URL is required.')

  const productionOrigin = new URL(configuredBaseURL).origin
  const consoleErrors: string[] = []
  const failedSameOriginRequests: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  page.on('requestfailed', (request) => {
    if (new URL(request.url()).origin === productionOrigin) {
      failedSameOriginRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown failure'}`)
    }
  })

  const rootResponse = await page.goto('/')
  expect(rootResponse?.ok()).toBe(true)

  const directHealthResponse = await page.goto('/carry-forward')
  expect(directHealthResponse?.ok()).toBe(true)

  await clearBrowserState(page)
  await openMachine(page)
  await commitTransaction(page)

  const machine = page.locator('.receipt-machine')
  await expect(machine).toHaveAttribute('data-phase', 'complete', { timeout: 20_000 })
  await expect(machine).toHaveAttribute('data-receipt-ending-state', 'documented')
  await expect(page.getByRole('heading', { name: 'The day is documented.', exact: true })).toBeVisible()

  const endDay = page.locator('[data-decision-choice]').filter({ hasText: 'END THE DAY HERE' })
  const carryForward = page.locator('[data-decision-choice]').filter({ hasText: 'CARRY ONE THING FORWARD' })
  await expect(endDay).toBeVisible()
  await expect(carryForward).toBeVisible()
  await expectNoLegacyToolbar(page)
  await expectNoSeriousAccessibilityViolations(page)
  await capture(page, 'documented-receipt-decision')

  await endDay.click()
  await expect(machine).toHaveAttribute('data-receipt-ending-state', 'end-choice')
  const keep = page.locator('[data-decision-choice]').filter({ hasText: 'KEEP RECEIPT' })
  const letGo = page.locator('[data-decision-choice]').filter({ hasText: 'LET IT GO' })
  await expect(keep).toBeVisible()
  await expect(letGo).toBeVisible()
  await expect(keep).toBeEnabled()
  await expect(letGo).toBeEnabled()
  await capture(page, 'keep-and-let-go-selector')

  await page.getByRole('button', { name: 'BACK TO ENDING CHOICE', exact: true }).click()
  await expect(machine).toHaveAttribute('data-receipt-ending-state', 'documented')

  await page.locator('[data-decision-choice]').filter({ hasText: 'CARRY ONE THING FORWARD' }).click()
  await expect(machine).toHaveAttribute('data-receipt-ending-state', 'carry-selected')
  await expect(page.getByRole('heading', { name: 'What is still asking something from you?', exact: true })).toBeVisible()
  await expect(page.locator('[data-carry-designation-origin="receipt"]')).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/')
  await capture(page, 'carry-forward-designation')

  await page.getByRole('button', { name: 'NOTHING AFTER ALL', exact: true }).click()
  await expect(machine).toHaveAttribute('data-receipt-ending-state', 'documented')

  const directResponse = await page.goto('/carry-forward')
  expect(directResponse?.ok()).toBe(true)
  await expect(page.getByRole('heading', { name: 'What is still asking something from you?', exact: true })).toBeVisible()
  await expect(page.locator('[data-carry-designation-origin="direct"]')).toBeVisible()
  await expect(page.locator('[data-receipt-ending-state]')).toHaveCount(0)
  await expect(page.getByText('The day is documented.', { exact: true })).toHaveCount(0)
  await capture(page, 'direct-carry-forward')

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  expect(failedSameOriginRequests, failedSameOriginRequests.join('\n')).toEqual([])
})
