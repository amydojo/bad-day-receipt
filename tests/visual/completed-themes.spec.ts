import { expect, test } from '@playwright/test'
import { choosePaper, waitForComplete } from '../fixtures/machine'

const papers = ['Original', 'CVS', 'Form BD-17', 'Luxury', 'Apothecary']

for (const paper of papers) {
  test(`captures completed ${paper} artifact`, async ({ page }, testInfo) => {
    await page.goto('/')
    await choosePaper(page, paper)

    const commit = page.getByTestId('mobile-commit')
    if (await commit.isVisible()) await commit.click()
    else await page.getByRole('button', { name: 'RING IT UP', exact: true }).first().click()

    await waitForComplete(page)
    await expect(page.locator('article.receipt')).toBeVisible()
    await testInfo.attach(`completed-${paper.toLowerCase().replaceAll(' ', '-')}`, {
      body: await page.locator('.receipt-machine').screenshot(),
      contentType: 'image/png',
    })
  })
}
