import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { mockPlatformApis } from '../fixtures/platformApis'

const accessPath = '/access/07/K7PM4A'

async function presentObject(page: import('@playwright/test').Page) {
  await expect(page.getByRole('button', { name: 'PRESENT OBJECT' })).toBeVisible()
  await page.getByRole('button', { name: 'PRESENT OBJECT' }).click()
  await expect(page.getByRole('button', { name: 'INSERT ARTIFACT' })).toBeVisible()
}

test.describe('Lab Dojo field access ritual', () => {
  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('uses one continuous found object to unlock the existing receipt machine', async ({ page }) => {
    await page.goto(accessPath)

    await expect(page.locator('.field-access-terminal')).toBeVisible()
    await expect(page.getByText('LD–RECOVERED')).toBeVisible()

    const continuousObject = page.locator('[data-continuous-object="true"]')
    await expect(continuousObject).toHaveCount(1)
    await continuousObject.evaluate((node) => {
      ;(node as HTMLElement & { fieldObjectIdentity?: string }).fieldObjectIdentity = 'same-object'
    })

    await presentObject(page)
    await expect(continuousObject).toHaveCount(1)
    expect(await continuousObject.evaluate((node) => (
      (node as HTMLElement & { fieldObjectIdentity?: string }).fieldObjectIdentity
    ))).toBe('same-object')

    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()
    await expect(page.locator('.field-machine-slot')).toHaveAttribute('data-phase', /captured|reading|accepted|unlocked/)
    await expect(page.getByRole('heading', { name: /BAD DAY RECEIPT/ })).toBeVisible({ timeout: 6000 })
    await page.getByRole('button', { name: 'BEGIN OPERATION' }).click()

    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
    await expect(page.locator('.field-access-provenance')).toContainText('LD–07 / K7PM4A')

    const stored = await page.evaluate(() => localStorage.getItem('labdojo-field-access-v1'))
    expect(stored).toContain('K7PM4A')
  })

  test('holds on the recognized digital twin until the operator continues', async ({ page }) => {
    await page.goto('/access/06/44ZSSL')
    await expect(page.getByRole('button', { name: 'PRESENT OBJECT' })).toBeVisible()
    await page.waitForTimeout(1800)
    await expect(page.locator('.field-access-terminal')).toHaveAttribute('data-state', 'recognized')
    await expect(page.locator('.field-card__e06-title')).toHaveText('CURIOSITYSUFFICIENT')
  })

  test('validates the QR on the card surface instead of scanning behind it', async ({ page }) => {
    await page.goto('/access/06/44ZSSL')
    await presentObject(page)
    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()

    await expect(page.getByText('VALIDATING QR', { exact: true })).toBeVisible({ timeout: 2500 })
    const qr = page.locator('.field-card__qr')
    await expect(qr).toBeVisible()
    await expect.poll(async () => qr.evaluate((node) => (
      getComputedStyle(node, '::before').opacity
    ))).not.toBe('0')
    await expect(page.getByText('QR VERIFIED', { exact: true })).toBeVisible({ timeout: 2500 })
  })

  test('keeps the unlocked launch control inside the mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 720 })
    await page.goto('/access/06/44ZSSL')
    await presentObject(page)
    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()

    const begin = page.getByRole('button', { name: 'BEGIN OPERATION' })
    await expect(begin).toBeVisible({ timeout: 6000 })
    const fits = await begin.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      return rect.top >= 0 && rect.bottom <= window.innerHeight
    })
    expect(fits).toBe(true)

    await begin.click()
    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
  })

  test('does not expose the old multi-screen verification sequence', async ({ page }) => {
    await page.goto(accessPath)
    await presentObject(page)
    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()

    await expect(page.getByText('VERIFYING ACCESS')).toHaveCount(0)
    await expect(page.getByText('CALIBRATING MACHINE')).toHaveCount(0)
    await expect(page.getByText('OBJECT ACCEPTED', { exact: true })).toBeVisible({ timeout: 4000 })
  })

  test('recognizes a previously accepted object after refresh', async ({ page }) => {
    await page.goto(accessPath)
    await presentObject(page)
    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()
    await expect(page.getByRole('button', { name: 'BEGIN OPERATION' })).toBeVisible({ timeout: 6000 })
    await page.getByRole('button', { name: 'BEGIN OPERATION' }).click()
    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()

    await page.reload()
    await expect(page.locator('.field-access-terminal')).toHaveAttribute('data-returning', 'true')
    await expect(page.getByRole('button', { name: 'PRESENT OBJECT' })).toBeVisible()
  })

  test('preserves the authored FIELD-001 print lines', async ({ page }) => {
    await page.goto('/access/01/CTNZL8')
    await expect(page.getByRole('button', { name: 'PRESENT OBJECT' })).toBeVisible()

    const entranceTitle = page.locator('.field-card__e01-title')
    await expect(entranceTitle).toHaveCSS('white-space', 'nowrap')
    await expect(entranceTitle).toHaveText('YOU FOUND ALAB ENTRANCE')
    await expect(page.locator('.field-access-terminal__header')).toContainText('LD–FIELD TERMINAL / 01')

    await page.goto('/access/09/STS68S')
    await expect(page.getByRole('button', { name: 'PRESENT OBJECT' })).toBeVisible()

    const noteTitle = page.locator('.field-card__e09-title')
    const metadata = page.locator('.field-card__e09-metadata')
    const body = page.locator('.field-card__e09-body')

    await expect(noteTitle).toHaveCSS('white-space', 'nowrap')
    await expect(noteTitle).toHaveText('OBSERVATION')
    await expect(metadata).toHaveText('SITE   PUBLICTIME   UNKNOWNSTATE  OPENCLASS  SOFT')
    await expect(body).toHaveText('The observation continues inside.Your attention completes it.')
    await expect(page.locator('.field-access-terminal__header')).toContainText('LD–FIELD TERMINAL / 09')
  })

  test('preserves comprehension without simulated motion when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(accessPath)
    await presentObject(page)
    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()
    await expect(page.getByRole('button', { name: 'BEGIN OPERATION' })).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: 'BEGIN OPERATION' }).click()
    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
  })

  test('fails unknown objects gracefully', async ({ page }) => {
    await page.goto('/access/99/K7PM4A')
    await expect(page.getByRole('heading', { name: /UNKNOWN FIELD OBJECT/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'OPEN SM–001 WITHOUT FIELD ACCESS' })).toBeVisible()
  })

  test('has no serious automated accessibility violations at the user-controlled insertion state', async ({ page }) => {
    await page.goto(accessPath)
    await presentObject(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const blocking = results.violations.filter((violation) => (
      violation.impact === 'critical' || violation.impact === 'serious'
    ))

    expect(blocking, blocking.map((violation) => violation.id).join(', ')).toEqual([])
  })
})
