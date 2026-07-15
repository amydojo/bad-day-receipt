import { expect, test } from '@playwright/test'
import {
  choosePaper,
  commitTransaction,
  openMachine,
  waitForComplete,
} from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Evidence Viewer ownership is mobile-specific.')
  await mockPlatformApis(page)
})

test('keeps the completed artifact inside a pinned Evidence Viewer', async ({ page }) => {
  await openMachine(page)
  const initialBodyScroll = await page.evaluate(() => window.scrollY)
  await commitTransaction(page)
  await waitForComplete(page)

  const viewer = page.locator('[data-evidence-viewer="true"]')
  await expect(viewer).toBeVisible()
  await expect(viewer.getByRole('heading', { name: 'Receipt complete' })).toBeFocused()
  await expect(viewer.getByRole('region', { name: /Completed receipt/ })).toBeVisible()
  await expect(viewer.getByRole('button', { name: 'SHARE', exact: true })).toBeVisible()
  await expect(viewer.getByRole('button', { name: 'SAVE', exact: true })).toBeVisible()
  await expect(viewer.getByRole('button', { name: 'MORE', exact: true })).toBeVisible()
  await expect(viewer.getByRole('button', { name: 'NEW', exact: true })).toBeVisible()

  const dockBox = await viewer.locator('.evidence-viewer__dock').boundingBox()
  const viewportHeight = page.viewportSize()?.height ?? 0
  expect(dockBox).not.toBeNull()
  expect((dockBox?.y ?? 0) + (dockBox?.height ?? 0)).toBeLessThanOrEqual(viewportHeight + 1)
  expect(await page.evaluate(() => window.scrollY)).toBe(initialBodyScroll)
})

test('opens More through the existing accessible sheet pattern', async ({ page }) => {
  await openMachine(page)
  await commitTransaction(page)
  await waitForComplete(page)

  await page.getByRole('button', { name: 'MORE', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'More evidence actions' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: /COPY TEXT/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /REPRINT/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /SHARE CARD/ })).toBeVisible()
  await dialog.getByRole('button', { name: /COPY TEXT/ }).click()
  await expect(dialog.getByText('COPIED TO CLIPBOARD')).toBeVisible()
})

test('reads the entire CVS tail through the internal receipt viewport', async ({ page }) => {
  await openMachine(page)
  await choosePaper(page, 'CVS')
  await commitTransaction(page)
  await waitForComplete(page)

  const viewport = page.getByRole('region', { name: /Completed receipt/ })
  const bodyScrollBefore = await page.evaluate(() => window.scrollY)
  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight
    element.dispatchEvent(new Event('scroll'))
  })

  await expect(page.getByText(/RECEIPT LENGTH/)).toBeVisible()
  await expect(page.getByText('100%', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.scrollY)).toBe(bodyScrollBefore)
})
