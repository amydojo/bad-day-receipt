import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

async function attach(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${testInfo.project.name}-carry-designation-${name}`, {
    body: await page.locator('.mobile-instrument, .carry-designation-app').first().screenshot(),
    contentType: 'image/png',
  })
}

test.describe('Carry designation visual evidence', () => {
  test.skip(!enabled, 'Carry designation visuals require VITE_THREE_ENDINGS=true')
  test.setTimeout(80_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('captures receipt-origin manual, source, preset, customize, and ritual-ready states', async ({ page }, testInfo) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
    await attach(page, testInfo, 'manual-entry')

    await page.getByLabel('ONE REMAINING OBLIGATION').fill('Reply to the insurance denial')
    await page.getByRole('button', { name: 'USE THIS ONE' }).click()
    await attach(page, testInfo, 'source-collapsed')

    await page.getByRole('button', { name: /ADD SOURCE TEXT OR CONTEXT/ }).click()
    await page.getByLabel('SOURCE TEXT OR CONTEXT').fill('Exact source context')
    await attach(page, testInfo, 'source-expanded')

    await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
    await attach(page, testInfo, 'preset')

    await page.getByRole('button', { name: 'CUSTOMIZE' }).click()
    await attach(page, testInfo, 'customize')
    await page.getByRole('button', { name: 'APPLY CUSTOMIZATION' }).click()

    await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
    await attach(page, testInfo, 'ritual-ready')
  })

  test('captures truthful direct entry', async ({ page }, testInfo) => {
    await page.goto('/carry-forward')
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
    await attach(page, testInfo, 'direct-entry')
  })
})
