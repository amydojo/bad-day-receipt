import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

async function attach(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${testInfo.project.name}-carry-ritual-${name}`, {
    body: await page.locator('.mobile-instrument').first().screenshot(),
    contentType: 'image/png',
  })
}

async function reachExtension(page: Page) {
  await openMachine(page)
  await commitTransaction(page)
  await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
  await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
  await page.getByLabel('ONE REMAINING OBLIGATION').fill('Reply to the insurance denial')
  await page.getByRole('button', { name: 'USE THIS ONE' }).click()
  await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
  await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
  await expect(page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' })).toBeVisible({ timeout: 10_000 })
}

async function reachActuator(page: Page) {
  await reachExtension(page)
  await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
  await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
  await expect(page.getByRole('button', { name: 'Push actuator to convert' })).toBeVisible({ timeout: 10_000 })
}

test.describe('Carry Forward ritual visual evidence', () => {
  test.skip(!enabled, 'Carry ritual visuals require VITE_THREE_ENDINGS=true')
  test.setTimeout(100_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('captures extension, torn stub, intake, and actuator force states', async ({ page }, testInfo) => {
    await reachExtension(page)
    await attach(page, testInfo, 'extension-attached')

    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await attach(page, testInfo, 'stub-separated')

    await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
    await expect(page.locator('[data-carry-ritual-phase="stub-aligning"]')).toBeVisible()
    await attach(page, testInfo, 'stub-aligning')

    const actuator = page.getByRole('button', { name: 'Push actuator to convert' })
    await expect(actuator).toBeVisible({ timeout: 10_000 })
    await actuator.focus()

    await actuator.press('ArrowDown')
    await expect(page.locator('[data-actuator-milestone="easy"]')).toBeVisible()
    await actuator.press('ArrowDown')
    await expect(page.locator('[data-actuator-milestone="medium"]')).toBeVisible()
    await attach(page, testInfo, 'actuator-55')

    await actuator.press('ArrowDown')
    await expect(page.locator('[data-actuator-milestone="heavy"]')).toBeVisible()
    await actuator.press('ArrowDown')
    await expect(page.locator('[data-actuator-milestone="detent"]')).toBeVisible()
    await attach(page, testInfo, 'actuator-92-detent')

    await page.evaluate(() => {
      const original = window.setTimeout.bind(window)
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        if (timeout === 120) return 2147483000
        return original(handler, timeout, ...args)
      }) as typeof window.setTimeout
    })
    await actuator.press('ArrowDown')
    await expect(page.locator('[data-actuator-milestone="locked"]')).toBeVisible()
    await attach(page, testInfo, 'actuator-locked')
  })

  test('captures registration and the issued Field Transfer', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await reachActuator(page)
    await page.getByRole('button', { name: 'Push actuator to convert' }).click()
    await expect(page.locator('[data-field-transfer]')).toBeVisible({ timeout: 10_000 })
    await attach(page, testInfo, 'transfer-registration')
    await expect(page.locator('[data-field-transfer-issued="true"]')).toBeVisible({ timeout: 10_000 })
    await attach(page, testInfo, 'field-transfer-issued')
  })
})
