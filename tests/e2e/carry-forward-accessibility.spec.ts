import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { compileCarryForwardDemo, mockCarryForwardCompiler } from '../fixtures/carryForward'

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const blocking = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([])
}

test.describe('Carry Forward accessibility gate', () => {
  test.beforeEach(async ({ page }) => {
    await mockCarryForwardCompiler(page)
  })

  test('input and active task states have no serious automated violations', async ({ page }) => {
    await page.goto('/carry-forward')
    await expectAccessible(page)
    await compileCarryForwardDemo(page)
    await expectAccessible(page)
  })

  test('Plan & Why is a named modal with a focused close control', async ({ page }) => {
    await compileCarryForwardDemo(page)
    await page.getByRole('button', { name: 'WHY THIS VIEW' }).click()
    const dialog = page.getByRole('dialog', { name: 'Why this view' })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: 'CLOSE' })).toBeFocused()
    await expectAccessible(page)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
