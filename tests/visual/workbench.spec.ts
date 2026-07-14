import { expect, test } from '@playwright/test'

test('captures the desktop workbench without horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.workspace')).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)

  await testInfo.attach('desktop-workbench', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})
