import { expect, test } from '@playwright/test'
import { choosePaper } from '../fixtures/machine'

const phases = [
  'arming',
  'scanning',
  'calculating',
  'feeding',
  'falseComplete',
  'printingCoupons',
  'stamping',
  'complete',
]

test('captures every CVS printer phase', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.goto('/?qualityPhaseHold=1')
  await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
  await choosePaper(page, 'CVS')

  const commit = page.getByTestId('mobile-commit')
  if (await commit.isVisible()) await commit.click()
  else await page.getByRole('button', { name: 'RING IT UP', exact: true }).first().click()

  for (const phase of phases) {
    await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', phase, { timeout: 30_000 })
    await testInfo.attach(`printer-${phase}`, {
      body: await page.locator('.receipt-machine').screenshot(),
      contentType: 'image/png',
    })
  }
})
