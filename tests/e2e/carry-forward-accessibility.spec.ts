import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { createInsuranceDenialPlan } from '../../src/carry-forward/fixtures'
import { compileCarryForwardDemo, mockCarryForwardCompiler, openCarryForwardPreview } from '../fixtures/carryForward'

async function settleAuthoredMotion(page: Page) {
  await page.evaluate(async () => {
    const finiteAnimations = document.getAnimations().filter((animation) => {
      const iterations = animation.effect?.getTiming().iterations
      return animation.playState !== 'finished' && iterations !== Infinity
    })
    await Promise.race([
      Promise.allSettled(finiteAnimations.map((animation) => animation.finished)),
      new Promise((resolve) => window.setTimeout(resolve, 1_000)),
    ])
  })
}

async function expectAccessible(page: Page) {
  await settleAuthoredMotion(page)
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

  test('M02, M05, and active task states have no serious automated violations', async ({ page }) => {
    await page.goto('/carry-forward')
    await expectAccessible(page)
    await openCarryForwardPreview(page)
    await expectAccessible(page)
    await page.getByRole('button', { name: /BEGIN ONE THING MODE/ }).click()
    await page.getByRole('heading', { name: 'Pin the deadline' }).waitFor()
    await expectAccessible(page)
  })

  test('M06 preserves accessible Cancel and End Mode while compilation is pending', async ({ page }) => {
    await page.unroute('**/api/compile-task')
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/api/compile-task', async (route) => {
      await gate
      try {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ plan: createInsuranceDenialPlan(), meta: { model: 'gpt-5.6-sol-test', repaired: false } }),
        })
      } catch {
        // Cancellation may close the request before the deterministic fixture is released.
      }
    })
    await openCarryForwardPreview(page)
    await page.getByRole('button', { name: /BEGIN ONE THING MODE/ }).click()
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M06')
    await expect(page.getByRole('button', { name: 'CANCEL' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'END MODE' }).first()).toBeVisible()
    await expectAccessible(page)
    await page.getByRole('button', { name: 'CANCEL' }).click()
    release()
  })

  test('Why This View is a named modal with focused close, Escape, and focus restoration', async ({ page }) => {
    await compileCarryForwardDemo(page)
    const trigger = page.getByRole('button', { name: 'WHY THIS VIEW' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: /Why this view/ })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: 'CLOSE' })).toBeFocused()
    await expectAccessible(page)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('M13 examples and actions are keyboard reachable', async ({ page }) => {
    await page.goto('/carry-forward')
    await page.getByLabel('WHAT STILL NEEDS DOING?').fill('Deal with that thing')
    await page.getByRole('button', { name: /ADD TASK CONTEXT/ }).click()
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M13')
    await expectAccessible(page)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /TRY AGAIN/ })).toBeFocused()
  })
})
