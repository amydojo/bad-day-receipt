import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { choosePaper, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

async function attachInstrument(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await testInfo.attach(name, {
    body: await page.locator('.mobile-instrument').screenshot(),
    contentType: 'image/png',
  })
}

async function waitForPhase(page: Page, phase: string): Promise<void> {
  await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', phase, { timeout: 90_000 })
}

test.describe('Mobile Instrument deterministic visual evidence', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('captures Compose ready, selected ledger, and service sheet', async ({ page }, testInfo) => {
    await openMachine(page)
    await attachInstrument(page, testInfo, 'compose-ready')

    await page.locator('.choice-chip[aria-pressed="false"]').first().click()
    await attachInstrument(page, testInfo, 'compose-selected-ledger')

    const settings = page.locator('.mobile-machine-tools').getByRole('button', { name: /SETTINGS/ })
    if (await settings.isVisible()) {
      await settings.click()
      await expect(page.getByRole('dialog', { name: 'Machine settings' })).toBeVisible()
      await attachInstrument(page, testInfo, 'compose-settings-sheet')
    }
  })

  test('captures standard chamber milestones', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'The full-viewport chamber is a mobile scene.')

    await page.goto('/?qualityPhaseHold=1')
    await page.getByTestId('mobile-commit').click()

    await waitForPhase(page, 'arming')
    await attachInstrument(page, testInfo, 'standard-chamber-entry')

    await waitForPhase(page, 'scanning')
    await attachInstrument(page, testInfo, 'standard-scanning')

    await waitForPhase(page, 'calculating')
    await attachInstrument(page, testInfo, 'standard-printer-wake')

    await waitForPhase(page, 'feeding')
    await attachInstrument(page, testInfo, 'standard-feeding')

    await waitForPhase(page, 'stamping')
    await attachInstrument(page, testInfo, 'standard-verdict')

    await waitForPhase(page, 'complete')
    await attachInstrument(page, testInfo, 'standard-evidence-top')
  })

  test('captures CVS apparent completion, restart, and long evidence', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'The full-viewport chamber is a mobile scene.')

    await page.goto('/?qualityPhaseHold=1')
    await choosePaper(page, 'CVS')
    await page.getByTestId('mobile-commit').click()

    await waitForPhase(page, 'falseComplete')
    await attachInstrument(page, testInfo, 'cvs-apparent-complete')

    await waitForPhase(page, 'printingCoupons')
    await attachInstrument(page, testInfo, 'cvs-coupon-feed')

    await waitForPhase(page, 'complete')
    await attachInstrument(page, testInfo, 'cvs-evidence-top')

    const reader = page.getByRole('region', { name: /Completed receipt/ })
    await reader.evaluate((element) => {
      element.scrollTop = element.scrollHeight / 2
      element.dispatchEvent(new Event('scroll'))
    })
    await attachInstrument(page, testInfo, 'cvs-evidence-middle')

    await reader.evaluate((element) => {
      element.scrollTop = element.scrollHeight
      element.dispatchEvent(new Event('scroll'))
    })
    await attachInstrument(page, testInfo, 'cvs-evidence-bottom')

    await page.getByRole('button', { name: 'MORE', exact: true }).click()
    await attachInstrument(page, testInfo, 'cvs-evidence-more-sheet')
  })

  test('captures the intentional desktop workbench and completed artifact', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'Desktop regression evidence only.')

    await openMachine(page)
    await attachInstrument(page, testInfo, 'desktop-workbench')

    await page.getByRole('button', { name: 'RING IT UP', exact: true }).first().click()
    await waitForPhase(page, 'complete')
    await attachInstrument(page, testInfo, 'desktop-completed-artifact')
  })
})
