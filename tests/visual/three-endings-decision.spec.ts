import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

async function attachExperience(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${testInfo.project.name}-${name}`, {
    body: await page.locator('.mobile-instrument').screenshot(),
    contentType: 'image/png',
  })
}

test.describe('Three Endings deterministic visual evidence', () => {
  test.skip(!enabled, 'Three Endings visual evidence requires VITE_THREE_ENDINGS=true')
  test.setTimeout(90_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('captures stillness, documented, disposition, Release, and Carry states', async ({ page }, testInfo) => {
    await openMachine(page)
    await commitTransaction(page)

    const machine = page.locator('.receipt-machine')
    await expect(machine).toHaveAttribute('data-receipt-ending-state', 'settling', { timeout: 20_000 })
    await attachExperience(page, testInfo, 'receipt-stillness')

    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeVisible()
    await attachExperience(page, testInfo, 'documented-decision')

    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await attachExperience(page, testInfo, 'keep-or-release')

    await page.getByRole('button', { name: /LET IT GO/ }).click()
    await attachExperience(page, testInfo, 'release-handoff')
    await page.getByRole('button', { name: 'BACK', exact: true }).click()

    await page.getByRole('button', { name: 'BACK TO ENDING CHOICE', exact: true }).click()
    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
    await attachExperience(page, testInfo, 'carry-handoff')
  })
})
