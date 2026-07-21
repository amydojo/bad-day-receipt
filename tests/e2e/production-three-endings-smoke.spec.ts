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

  for (const testId of ['legacy-share', 'legacy-save', 'legacy-archive', 'legacy-more']) {
    await expect(page.getByTestId(testId)).toHaveCount(0)
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

test('live production exposes the documented Three Endings decision and truthful direct entry', async ({ page }, testInfo) => {
  const productionOrigin = new URL(testInfo.project.use.baseURL as string).origin
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

  await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', 'complete', { timeout: 20_000 })
  await expect(page.getByTestId('receipt-decision-status')).toHaveText('The day is documented.')
  await expect(page.getByTestId('receipt-decision-end-day')).toHaveText(/End the day here/i)
  await expect(page.getByTestId('receipt-decision-carry-forward')).toHaveText(/Carry one thing forward/i)
  await expectNoLegacyToolbar(page)
  await expectNoSeriousAccessibilityViolations(page)
  await capture(page, 'documented-receipt-decision')

  await page.getByTestId('receipt-decision-end-day').click()
  const keep = page.getByTestId('ending-choose-keep')
  const letGo = page.getByTestId('ending-choose-release')
  await expect(keep).toBeVisible()
  await expect(letGo).toBeVisible()
  await expect(keep).toBeEnabled()
  await expect(letGo).toBeEnabled()
  await capture(page, 'keep-and-let-go-selector')

  await page.getByTestId('ending-return-receipt').click()
  await expect(page.getByTestId('receipt-decision-status')).toBeVisible()

  await page.getByTestId('receipt-decision-carry-forward').click()
  await expect(page.getByTestId('carry-designation-heading')).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/')
  await capture(page, 'carry-forward-designation')

  await page.getByTestId('carry-designation-nothing').click()
  await expect(page.getByTestId('receipt-decision-status')).toBeVisible()

  const directResponse = await page.goto('/carry-forward')
  expect(directResponse?.ok()).toBe(true)
  await expect(page.getByTestId('carry-forward-heading')).toBeVisible()
  await expect(page.getByTestId('receipt-decision-status')).toHaveCount(0)
  await expect(page.getByTestId('receipt-archive-entry')).toHaveCount(0)
  await expect(page.getByText('The day is documented.', { exact: true })).toHaveCount(0)
  await capture(page, 'direct-carry-forward')

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  expect(failedSameOriginRequests, failedSameOriginRequests.join('\n')).toEqual([])
})
