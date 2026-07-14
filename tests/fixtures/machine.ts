import { expect, type Page } from '@playwright/test'

export async function openMachine(page: Page) {
  await page.goto('/')
  await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
}

export async function choosePaper(page: Page, name: string) {
  const mobileTools = page.locator('.mobile-machine-tools')
  if (await mobileTools.isVisible()) {
    await mobileTools.getByRole('button', { name: /PAPER/ }).click()
    await page.locator('.sheet-paper-option').filter({ hasText: name }).click()
    return
  }

  await page.locator('.theme-tab').filter({ hasText: name }).click()
}

export async function commitTransaction(page: Page) {
  const mobileCommit = page.getByTestId('mobile-commit')
  if (await mobileCommit.isVisible()) {
    await mobileCommit.click()
  } else {
    await page.getByRole('button', { name: 'RING IT UP', exact: true }).first().click()
  }
  await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', /arming|scanning|calculating|feeding/)
}

export async function waitForPhase(page: Page, phase: string) {
  await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', phase)
}

export async function waitForComplete(page: Page) {
  await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', 'complete', { timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'SHARE', exact: true })).toBeVisible()
}

export async function selectOneAdditionalCharge(page: Page) {
  const unselected = page.locator('.choice-chip[aria-pressed="false"]').first()
  await expect(unselected).toBeVisible()
  const itemId = await unselected.getAttribute('data-item-id')
  expect(itemId).toBeTruthy()
  await unselected.click()
  await expect(page.locator(`.choice-chip[data-item-id="${itemId}"]`)).toHaveAttribute('aria-pressed', 'true')
}
