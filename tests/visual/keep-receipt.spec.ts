import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'
const held = Number(process.env.VITE_KEEP_RITUAL_TEST_HOLD_MS ?? 0) >= 50

async function attachExperience(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${testInfo.project.name}-keep-${name}`, {
    body: await page.locator('.mobile-instrument').screenshot(),
    contentType: 'image/png',
  })
}

test.describe('Keep Receipt deterministic visual evidence', () => {
  test.skip(!enabled, 'Keep visual evidence requires VITE_THREE_ENDINGS=true')
  test.skip(!held, 'Set VITE_KEEP_RITUAL_TEST_HOLD_MS to hold semantic phases for capture')
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('captures the actual receipt through cut sleeve label archive and completion', async ({ page }, testInfo) => {
    await openMachine(page)
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
    await page.getByRole('button', { name: /END THE DAY HERE/ }).click()
    await page.getByRole('button', { name: /KEEP RECEIPT/ }).click()

    const machine = page.locator('.receipt-machine')
    for (const phase of [
      'cut',
      'align',
      'sleeve-rising',
      'sleeve-receiving',
      'label-registering',
      'archive-opening',
      'archiving',
      'archive-closing',
    ]) {
      await expect(machine).toHaveAttribute('data-keep-phase', phase, { timeout: 20_000 })
      await attachExperience(page, testInfo, phase)
    }

    await expect(page.getByRole('heading', { name: 'Receipt kept with care.' })).toBeFocused({ timeout: 20_000 })
    await attachExperience(page, testInfo, 'completion-stillness')

    await page.getByRole('button', { name: 'CLOSE', exact: true }).click()
    await page.getByRole('button', { name: /RECORDS/ }).click()
    await attachExperience(page, testInfo, 'private-archive-index')

    const archiveEntry = page.getByRole('button', { name: /Open archived receipt/ }).first()
    await archiveEntry.click()
    await attachExperience(page, testInfo, 'archived-receipt-detail')
  })
})
