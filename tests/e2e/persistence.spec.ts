import { expect, test } from '@playwright/test'
import { openMachine } from '../fixtures/machine'
import { seedMachineStorage } from '../fixtures/platformApis'

const item = {
  id: 'recovered',
  label: 'Recovered local draft',
  amount: 9,
  kind: 'charge',
  quantity: 1,
}

function persistedData(overrides: Record<string, unknown> = {}) {
  return {
    draft: [item],
    themeId: 'cvs',
    history: [],
    preferences: { soundEnabled: true, hapticsEnabled: false },
    pendingCommit: null,
    lastCompleted: null,
    ...overrides,
  }
}

test('restores draft, paper stock, and preferences', async ({ page }) => {
  await seedMachineStorage(page, persistedData())
  await openMachine(page)

  await expect(page.getByRole('button', { name: /Recovered local draft/i })).toHaveAttribute('aria-pressed', 'true')

  const mobileTools = page.locator('.mobile-machine-tools')
  if (await mobileTools.isVisible()) {
    await expect(mobileTools.getByRole('button', { name: /PAPER/ })).toContainText('CVS')
  } else {
    await expect(page.locator('.theme-tab[aria-pressed="true"]')).toContainText('CVS')
  }
})

test('recovers pending work as a clean idle draft', async ({ page }) => {
  await seedMachineStorage(page, persistedData({
    draft: [],
    pendingCommit: {
      items: [item],
      themeId: 'cvs',
      startedAt: '2026-07-13T12:00:00.000Z',
    },
  }))
  await openMachine(page)

  await expect(page.locator('.receipt-machine')).toHaveAttribute('data-phase', 'idle')
  await expect(page.getByRole('button', { name: /Recovered local draft/i })).toHaveAttribute('aria-pressed', 'true')
})

test('malformed state does not crash the machine', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bad-day-receipt-machine-v1', '{not valid json')
  })
  await openMachine(page)
  await expect(page.getByRole('heading', { name: /bad day receipt/i })).toBeVisible()
})
