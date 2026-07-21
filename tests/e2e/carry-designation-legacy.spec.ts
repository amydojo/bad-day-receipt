import { expect, test } from '@playwright/test'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

test.describe('feature-disabled Carry Forward route', () => {
  test.skip(enabled, 'Legacy direct route is exercised only when Three Endings is disabled')

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('keeps the existing direct-entry compiler flow intact', async ({ page }) => {
    await page.goto('/carry-forward')
    await expect(page.getByRole('heading', { name: 'What still needs doing?' })).toBeFocused()
    await expect(page.locator('[data-carry-designation-route="direct"]')).toHaveCount(0)
    await expect(page.getByLabel('WHAT STILL NEEDS DOING?')).toBeVisible()
  })
})
