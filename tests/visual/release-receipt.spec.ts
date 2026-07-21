import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'
const held = Number(process.env.VITE_RELEASE_RITUAL_TEST_HOLD_MS ?? 0) >= 50

async function attachExperience(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${testInfo.project.name}-release-${name}`, {
    body: await page.locator('.mobile-instrument').screenshot(),
    contentType: 'image/png',
  })
}

test.describe('Release deterministic visual evidence', () => {
  test.skip(!enabled, 'Release visual evidence requires VITE_THREE_ENDINGS=true')
  test.skip(!held, 'Set VITE_RELEASE_RITUAL_TEST_HOLD_MS to hold semantic phases for capture')
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('captures thermal withdrawal, softening, slot receipt, and completion', async ({ page }, testInfo) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await page.getByRole('button', { name: /LET IT GO/ }).click()

    const machine = page.locator('.receipt-machine')
    for (const phase of [
      'cut',
      'unprint-total',
      'unprint-lines',
      'unprint-receipt-number',
      'unprint-acknowledgment',
      'soften',
      'slot-opening',
      'receiving',
      'corner-hold',
      'slot-closing',
    ]) {
      await expect(machine).toHaveAttribute('data-release-phase', phase, { timeout: 20_000 })
      await attachExperience(page, testInfo, phase)
    }

    await expect(page.getByRole('heading', { name: 'The day can end here.' })).toBeFocused({ timeout: 20_000 })
    await attachExperience(page, testInfo, 'released-completion')
  })
})
