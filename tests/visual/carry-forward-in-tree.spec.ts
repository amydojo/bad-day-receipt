import { expect, test, type Page, type TestInfo } from '@playwright/test'
import {
  INSURANCE_DENIAL_SOURCE,
  INSURANCE_DENIAL_TASK,
} from '../../src/carry-forward/fixtures'
import { mockCarryForwardCompiler } from '../fixtures/carryForward'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

async function reachIssuedTransfer(page: Page) {
  await openMachine(page)
  await commitTransaction(page)
  await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
  await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
  await page.getByLabel('ONE REMAINING OBLIGATION').fill(INSURANCE_DENIAL_TASK)
  await page.getByRole('button', { name: 'USE THIS ONE' }).click()
  await page.getByRole('button', { name: 'ADD SOURCE TEXT OR CONTEXT' }).click()
  await page.getByLabel('SOURCE TEXT OR CONTEXT').fill(INSURANCE_DENIAL_SOURCE)
  await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
  await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
  await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
  await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
  await page.getByRole('button', { name: 'Push actuator to convert' }).click()
  await expect(page.locator('[data-field-transfer-issued="true"]')).toBeVisible({ timeout: 10_000 })
}

async function attachHost(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${testInfo.project.name}-carry-in-tree-${name}`, {
    body: await page.locator('.cf-in-tree-host').screenshot(),
    contentType: 'image/png',
  })
}

test.describe('Carry Forward in-tree visual evidence', () => {
  test.skip(!enabled, 'In-tree visuals require VITE_THREE_ENDINGS=true')
  test.setTimeout(100_000)

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockPlatformApis(page)
    await mockCarryForwardCompiler(page)
  })

  test('captures the truthful Applying Field Transfer state', async ({ page }, testInfo) => {
    await reachIssuedTransfer(page)
    await page.evaluate(() => {
      const original = window.setTimeout.bind(window)
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        if (timeout === 800) return 2147483000
        return original(handler, timeout, ...args)
      }) as typeof window.setTimeout
    })

    await page.getByRole('button', { name: 'APPLY' }).click()
    await expect(page.locator('[data-field-transfer-status="applying"]')).toBeVisible()
    await expect(page.getByText('MINIMUM INTERFACE READY', { exact: true })).toBeVisible()
    await attachHost(page, testInfo, 'applying-field-transfer')
  })

  test('captures the quiet Figma decision state with its action dock', async ({ page }, testInfo) => {
    await reachIssuedTransfer(page)
    await page.getByRole('button', { name: 'APPLY' }).click()
    await expect(page.getByRole('heading', { name: 'Pin the deadline' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Choose a submission route' })).toBeVisible()
    await page.getByRole('button', { name: /SHOW ALL CHOICES/ }).click()
    await page.getByRole('radio', { name: /Member portal/ }).check()
    await expect(page.getByRole('button', { name: 'Confirm choice', exact: true })).toBeVisible()
    await attachHost(page, testInfo, 'one-thing-mode-decision')
  })
})
