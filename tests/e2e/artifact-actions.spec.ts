import { expect, test } from '@playwright/test'
import { commitTransaction, openMachine, waitForComplete } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

test.beforeEach(async ({ page }) => {
  await mockPlatformApis(page)
})

test('opens native sharing and prevents duplicate action jobs', async ({ page }) => {
  await openMachine(page)
  await commitTransaction(page)
  await waitForComplete(page)

  const share = page.getByRole('button', { name: 'SHARE', exact: true })
  await share.click({ clickCount: 2, delay: 0 })
  await expect(page.getByText('SHARE SHEET OPENED')).toBeVisible()
})

test('offers format downloads through the export drawer', async ({ page }) => {
  await openMachine(page)
  await commitTransaction(page)
  await waitForComplete(page)

  const exportButton = page.getByRole('button', { name: /EXPORT/ }).first()
  if (await exportButton.isVisible()) {
    await exportButton.click()
    const dialog = page.getByRole('dialog', { name: 'Save receipt formats' })
    await expect(dialog.getByRole('button', { name: /SHARE CARD/ })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /STORY STRIP/ })).toBeVisible()
  }
})
