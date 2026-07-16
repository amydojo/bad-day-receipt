import { expect, test } from '@playwright/test'
import { mockPlatformApis } from '../fixtures/platformApis'

const fieldObjects = [
  { edition: '01', token: 'CTNZL8' },
  { edition: '02', token: 'W9JK4J' },
  { edition: '03', token: 'NRDND8' },
  { edition: '04', token: '7PGQZM' },
  { edition: '05', token: 'JEJCFM' },
  { edition: '06', token: '44ZSSL' },
  { edition: '07', token: 'J49AQW' },
  { edition: '08', token: 'JWB639' },
  { edition: '09', token: 'STS68S' },
  { edition: '10', token: 'DJ39LF' },
] as const

test.describe('FIELD–001 opening sequence matrix', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
    await page.setViewportSize({ width: 390, height: 720 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  for (const fieldObject of fieldObjects) {
    const path = `/access/${fieldObject.edition}/${fieldObject.token}`

    test(`edition ${fieldObject.edition} opens without document scrolling or collisions`, async ({ page }) => {
      await page.goto(path)
      const present = page.getByRole('button', { name: 'PRESENT OBJECT' })
      await expect(present).toBeVisible()
      await expect(page.locator(`.field-card--${fieldObject.edition}`)).toBeVisible()

      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => {
          const node = document.querySelector<HTMLElement>(selector)
          if (!node) throw new Error(`Missing ${selector}`)
          const box = node.getBoundingClientRect()
          return { top: box.top, right: box.right, bottom: box.bottom, left: box.left }
        }

        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          scrollY: window.scrollY,
          rootLocked: document.documentElement.classList.contains('field-access-scroll-locked'),
          bodyLocked: document.body.classList.contains('field-access-scroll-locked'),
          bodyPosition: getComputedStyle(document.body).position,
          terminal: rect('.field-access-terminal'),
          shell: rect('.field-access-terminal__shell'),
          card: rect('.field-object-card'),
          qr: rect('.field-card__qr'),
          action: rect('.field-access-button--present'),
          footer: rect('.field-access-terminal__footer'),
          recognizedGestureDisplay: getComputedStyle(
            document.querySelector<HTMLElement>('.field-access-one-shot__gesture')!,
          ).display,
        }
      })

      expect(geometry.rootLocked).toBe(true)
      expect(geometry.bodyLocked).toBe(true)
      expect(geometry.bodyPosition).toBe('fixed')
      expect(geometry.scrollY).toBe(0)
      expect(geometry.terminal.top).toBeGreaterThanOrEqual(-1)
      expect(geometry.terminal.bottom).toBeLessThanOrEqual(geometry.viewport.height + 1)
      expect(geometry.shell.top).toBeGreaterThanOrEqual(-1)
      expect(geometry.shell.bottom).toBeLessThanOrEqual(geometry.viewport.height + 1)
      expect(geometry.card.bottom + 12).toBeLessThan(geometry.action.top)
      expect(geometry.action.bottom + 8).toBeLessThanOrEqual(geometry.footer.top)
      expect(geometry.qr.left).toBeGreaterThanOrEqual(geometry.card.left)
      expect(geometry.qr.right).toBeLessThanOrEqual(geometry.card.right)
      expect(geometry.qr.top).toBeGreaterThanOrEqual(geometry.card.top)
      expect(geometry.qr.bottom).toBeLessThanOrEqual(geometry.card.bottom)
      expect(geometry.recognizedGestureDisplay).toBe('none')

      await page.evaluate(() => window.scrollTo(0, 400))
      await page.waitForTimeout(50)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
    })

    test(`edition ${fieldObject.edition} validates its own QR and reaches the machine`, async ({ page }) => {
      await page.goto(path)
      await page.getByRole('button', { name: 'PRESENT OBJECT' }).click()
      await expect(page.getByRole('button', { name: 'INSERT ARTIFACT' })).toBeVisible()
      await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()

      const qr = page.locator(`.field-card--${fieldObject.edition} .field-card__qr`)
      await expect(qr).toBeVisible()
      await expect(page.getByText('QR VERIFIED', { exact: true })).toBeVisible({ timeout: 3000 })
      await expect.poll(async () => qr.evaluate((node) => (
        getComputedStyle(node, '::before').opacity
      ))).not.toBe('0')

      const begin = page.getByRole('button', { name: 'BEGIN OPERATION' })
      await expect(begin).toBeVisible({ timeout: 3000 })
      const launchGeometry = await begin.evaluate((node) => {
        const box = node.getBoundingClientRect()
        return {
          top: box.top,
          bottom: box.bottom,
          viewportHeight: window.innerHeight,
        }
      })
      expect(launchGeometry.top).toBeGreaterThanOrEqual(0)
      expect(launchGeometry.bottom).toBeLessThanOrEqual(launchGeometry.viewportHeight)

      await begin.click()
      await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
    })
  }
})
