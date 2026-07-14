import { expect, type Page } from '@playwright/test'

export async function openMachine(page: Page) {
  await page.goto('/')
  await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
}

export async function choosePaper(page: Page, name: string) {
  const mobilePaper = page.getByRole('button', { name: /PAPER/ }).first()
  if (await mobilePaper.isVisible()) {
    await mobilePaper.click()
    await page.getByRole('dialog').getByRole('button', { name: new RegExp(name, 'i') }).click()
    return
  }

  await page.getByRole('button', { name: new RegExp(name, 'i') }).first().click()
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
  await unselected.click()
  await expect(unselected).toHaveAttribute('aria-pressed', 'true')
}
