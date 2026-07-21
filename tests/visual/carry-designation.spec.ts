import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

async function attach(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${testInfo.project.name}-carry-designation-${name}`, {
    body: await page.locator('.mobile-instrument, .carry-designation-app').first().screenshot(),
    contentType: 'image/png',
  })
}

async function openReceiptDesignation(page: Page, fixture?: 'single' | 'multiple') {
  if (fixture) {
    await page.goto(`/?carry-designation-fixture=${fixture}`)
    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
  } else {
    await openMachine(page)
  }
  await commitTransaction(page)
  await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
  await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
  await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
}

test.describe('Carry designation visual evidence', () => {
  test.skip(!enabled, 'Carry designation visuals require VITE_THREE_ENDINGS=true')
  test.setTimeout(100_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('captures receipt-origin suggestion and multiple-choice states', async ({ page }, testInfo) => {
    await openReceiptDesignation(page, 'single')
    await attach(page, testInfo, 'suggestion')

    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/?carry-designation-fixture=multiple')
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
    await expect(page.getByRole('radio')).toHaveCount(2)
    await attach(page, testInfo, 'multiple-choices')
  })

  test('captures receipt-origin manual, source, preset, customize, and extension states', async ({ page }, testInfo) => {
    await openReceiptDesignation(page)
    await attach(page, testInfo, 'manual-entry')

    await page.getByLabel('ONE REMAINING OBLIGATION').fill('Reply to the insurance denial')
    await page.getByRole('button', { name: 'USE THIS ONE' }).click()
    await attach(page, testInfo, 'source-collapsed')

    await page.getByRole('button', { name: /ADD SOURCE TEXT OR CONTEXT/ }).click()
    await page.getByLabel('SOURCE TEXT OR CONTEXT').fill('Exact source context')
    await attach(page, testInfo, 'source-expanded')

    await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
    await attach(page, testInfo, 'preset')

    await page.getByRole('button', { name: 'CUSTOMIZE' }).click()
    await attach(page, testInfo, 'customize')
    await page.getByRole('button', { name: 'APPLY CUSTOMIZATION' }).click()

    await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
    await expect(page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' })).toBeVisible({ timeout: 10_000 })
    await attach(page, testInfo, 'extension-ready')
  })

  test('captures direct entry across compact, landscape, desktop, and zoomed layouts', async ({ page }, testInfo) => {
    const viewports = [
      { name: '320x568', width: 320, height: 568 },
      { name: '390x844', width: 390, height: 844 },
      { name: 'landscape-667x375', width: 667, height: 375 },
      { name: 'desktop-1440x900', width: 1440, height: 900 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/carry-forward')
      await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeFocused()
      await attach(page, testInfo, `direct-${viewport.name}`)
    }

    await page.setViewportSize({ width: 640, height: 900 })
    await page.goto('/carry-forward')
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2'
    })
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeVisible()
    await attach(page, testInfo, 'direct-200-percent-zoom')
  })
})
