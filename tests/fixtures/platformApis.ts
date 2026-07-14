import type { Page } from '@playwright/test'

export async function mockPlatformApis(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => true,
    })
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true,
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => undefined,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => undefined },
    })
  })
}

export async function seedMachineStorage(page: Page, data: unknown) {
  await page.addInitScript((stored) => {
    localStorage.setItem('bad-day-receipt-machine-v1', JSON.stringify({
      version: 1,
      writtenAt: '2026-07-13T12:00:00.000Z',
      data: stored,
    }))
  }, data)
}
