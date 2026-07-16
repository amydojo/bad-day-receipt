import { expect, test } from '@playwright/test'
import { mockPlatformApis } from '../fixtures/platformApis'

test('the recognized opening stays fixed and unobstructed at 390 by 844', async ({ page }) => {
  await mockPlatformApis(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/access/06/44ZSSL')

  const present = page.getByRole('button', { name: 'PRESENT OBJECT' })
  await expect(present).toBeVisible()

  const geometry = await page.evaluate(() => {
    const bounds = (selector: string) => {
      const node = document.querySelector<HTMLElement>(selector)
      if (!node) throw new Error(`Missing ${selector}`)
      const box = node.getBoundingClientRect()
      return { top: box.top, bottom: box.bottom }
    }

    return {
      viewportHeight: window.innerHeight,
      scrollY: window.scrollY,
      terminal: bounds('.field-access-terminal'),
      card: bounds('.field-object-card'),
      action: bounds('.field-access-button--present'),
      footer: bounds('.field-access-terminal__footer'),
      gesture: getComputedStyle(
        document.querySelector<HTMLElement>('.field-access-one-shot__gesture')!,
      ).display,
    }
  })

  expect(geometry.scrollY).toBe(0)
  expect(geometry.terminal.top).toBeGreaterThanOrEqual(-1)
  expect(geometry.terminal.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1)
  expect(geometry.card.bottom + 16).toBeLessThan(geometry.action.top)
  expect(geometry.action.bottom + 8).toBeLessThanOrEqual(geometry.footer.top)
  expect(geometry.gesture).toBe('none')

  await page.evaluate(() => window.scrollTo(0, 600))
  await page.waitForTimeout(50)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})
