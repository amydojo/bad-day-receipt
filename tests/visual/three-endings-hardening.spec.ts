import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'
import {
  installStorageWriteFault,
  MACHINE_STORAGE_KEY,
} from '../fixtures/threeEndingsFaults'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

async function attach(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${testInfo.project.name}-three-endings-hardening-${name}`, {
    body: await page.locator('.mobile-instrument').first().screenshot(),
    contentType: 'image/png',
  })
}

async function reachDocumented(page: Page) {
  await openMachine(page)
  await commitTransaction(page)
  await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
}

async function reachCarryExtension(page: Page) {
  await reachDocumented(page)
  await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
  await page.getByLabel('ONE REMAINING OBLIGATION').fill('Reply to the insurance denial')
  await page.getByRole('button', { name: 'USE THIS ONE' }).click()
  await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
  await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
  await expect(page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' })).toBeVisible({ timeout: 10_000 })
}

test.describe('Three Endings hardening visual evidence', () => {
  test.skip(!enabled, 'Hardening visuals require VITE_THREE_ENDINGS=true')
  test.setTimeout(90_000)

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockPlatformApis(page)
  })

  test('captures privacy-safe separated-stub recovery after refresh', async ({ page }, testInfo) => {
    await reachCarryExtension(page)
    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'The receipt is still complete.' })).toBeFocused({ timeout: 20_000 })
    await expect(page.locator('[data-carry-checkpoint-recovery="stub-separated"]')).toBeVisible()
    await attach(page, testInfo, 'carry-separated-stub-recovery')
  })

  test('captures Release storage recovery without invalidating the receipt', async ({ page }, testInfo) => {
    await reachDocumented(page)
    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await installStorageWriteFault(page, MACHINE_STORAGE_KEY, 'quota')
    await page.getByRole('button', { name: /LET IT GO/ }).click()
    await expect(page.getByRole('heading', { name: 'The receipt is still here.' })).toBeFocused({ timeout: 20_000 })
    await expect(page.locator('[data-receipt-artifact]')).toBeVisible()
    await attach(page, testInfo, 'release-storage-recovery')
  })
})
