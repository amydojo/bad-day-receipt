import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { mockPlatformApis } from '../fixtures/platformApis'

const accessPath = '/access/07/J49AQW'
const fieldObjects = [
  ['01', 'CTNZL8'],
  ['02', 'W9JK4J'],
  ['03', 'NRDND8'],
  ['04', '7PGQZM'],
  ['05', 'JEJCFM'],
  ['06', '44ZSSL'],
  ['07', 'J49AQW'],
  ['08', 'JWB639'],
  ['09', 'STS68S'],
  ['10', 'DJ39LF'],
] as const

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
    await expect(page.locator('.field-access-one-shot')).toHaveAttribute('data-phase', 'unlocked', { timeout: 6000 })
    await expect(page.getByRole('heading', { name: /bad day receipt/i })).toBeVisible({ timeout: 6000 })
    await expect(page.locator('.field-access-machine-reveal > span')).toHaveText('LD–001 / LAB DOJO MACHINE')
    await expect(page.getByText('QR VERIFIED', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'BEGIN OPERATION' }).click()

    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
    await expect(page.locator('.field-access-provenance')).toContainText('FIELD–001 · OBJECT 07 / 10')
    await expect(page.locator('.field-access-provenance')).toContainText('LD–001 / BAD DAY RECEIPT')

    const stored = await page.evaluate(() => localStorage.getItem('labdojo-field-access-v1'))
    expect(stored).toContain('J49AQW')
    expect(stored).toContain('LD-001')
  })

  test('makes the first discovery collectible and geographically real before asking for action', async ({ page }) => {
    await page.goto('/access/06/44ZSSL')

    await expect(page.getByRole('button', { name: 'PRESENT OBJECT' })).toBeVisible()
    await expect(page.getByText('FIELD OBJECT 06 / RECOVERED', { exact: true })).toBeVisible()
    await expect(page.getByText('One of ten physical access objects released across Southern California.', { exact: true })).toBeVisible()
    await expect(page.locator('.field-access-one-shot__metadata')).toContainText('FIELD–001')
    await expect(page.locator('.field-access-one-shot__metadata')).toContainText('OBJECT 06 / 10')
  })

  test('holds on the recognized digital twin until the operator continues', async ({ page }) => {
    await page.goto('/access/06/44ZSSL')
    await expect(page.getByRole('button', { name: 'PRESENT OBJECT' })).toBeVisible()
    await page.waitForTimeout(1800)
    await expect(page.locator('.field-access-terminal')).toHaveAttribute('data-state', 'recognized')
    await expect(page.locator('.field-card__e06-title')).toHaveText('CURIOSITYSUFFICIENT')
  })

  test('uses the same collectible notation for all ten physical objects', async ({ page }) => {
    test.setTimeout(60_000)
    for (const [edition, token] of fieldObjects) {
      await page.goto(`/access/${edition}/${token}`)
      await expect(page.getByRole('button', { name: 'PRESENT OBJECT' })).toBeVisible()
      await expect(page.getByText(`FIELD OBJECT ${edition} / RECOVERED`, { exact: true })).toBeVisible()
      await expect(page.locator('.field-access-one-shot__metadata')).toContainText(`OBJECT ${edition} / 10`)
      await expect(page.locator('.field-access-terminal')).toHaveJSProperty('scrollHeight', await page.locator('.field-access-terminal').evaluate((node) => node.clientHeight))
    }
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
    await expect(page.locator('.field-access-one-shot')).toHaveAttribute('data-phase', 'unlocked', { timeout: 6000 })
    await expect(begin).toBeVisible()
    const geometry = await begin.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      const slot = node.closest<HTMLElement>('.field-machine-slot')?.getBoundingClientRect()
      const content = node.closest<HTMLElement>('.field-machine-slot__machine-content')?.getBoundingClientRect()
      return {
        top: rect.top,
        bottom: rect.bottom,
        slotTop: slot?.top,
        slotBottom: slot?.bottom,
        contentTop: content?.top,
        contentBottom: content?.bottom,
        viewportHeight: window.innerHeight,
      }
    })
    expect(geometry.top, JSON.stringify(geometry)).toBeGreaterThanOrEqual(0)
    expect(geometry.bottom, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewportHeight)

    await begin.click()
    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
  })

  test('does not expose the old multi-screen verification sequence', async ({ page }) => {
    await page.goto(accessPath)
    await presentObject(page)
    await page.getByRole('button', { name: 'INSERT ARTIFACT' }).click()

    await expect(page.getByText('VERIFYING ACCESS')).toHaveCount(0)
    await expect(page.getByText('CALIBRATING MACHINE')).toHaveCount(0)
    await expect(page.locator('.field-access-one-shot')).toHaveAttribute('data-phase', 'unlocked', { timeout: 6000 })
    await expect(page.getByText('QR VERIFIED', { exact: true })).toBeVisible({ timeout: 6000 })
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
    await expect(page.getByText('FIELD OBJECT 07 / RECOGNIZED', { exact: true })).toBeVisible()
    await expect(page.getByText('Previously recovered. This object’s field history remains active.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PRESENT OBJECT' })).toBeVisible()
  })

  test('renders the public ten-object field ledger without exposing tokens', async ({ page }) => {
    await page.route('**/functions/v1/field-release', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          releaseCode: 'FIELD-001',
          releaseLabel: 'FIELD–001',
          machineCode: 'LD-001',
          machineLabel: 'LD–001',
          machineName: 'Bad Day Receipt',
          region: 'SOUTHERN CALIFORNIA',
          total: 10,
          recoveredCount: 1,
          generatedAt: '2026-07-17T00:00:00.000Z',
          cards: fieldObjects.map(([edition]) => ({
            edition,
            object_name: edition === '04' ? 'Human Subject' : 'Field Object',
            object_type: 'field-object',
            status: edition === '04' ? 'recovered' : 'signal-absent',
            recovered_at: edition === '04' ? '2026-07-17T00:00:00.000Z' : null,
            last_seen_at: null,
            operation_count: edition === '04' ? 1 : 0,
            region: 'SOUTHERN CALIFORNIA',
          })),
        }),
      })
    })

    await page.goto('/field/001?edition=06&token=44ZSSL&source=test')
    await expect(page.getByRole('heading', { name: 'FIELD–001' })).toBeVisible()
    await expect(page.getByText('01 / 10')).toBeVisible()
    await expect(page.locator('.field-release-object')).toHaveCount(10)
    await expect(page.locator('.field-release-object[data-status="recovered"]')).toHaveCount(1)
    await expect(page.getByText('OPERATED LD–001')).toBeVisible()
    await expect(page.getByText(/44ZSSL|J49AQW|CTNZL8/)).toHaveCount(0)
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
    await expect(page.getByRole('link', { name: 'OPEN LD–001 WITHOUT FIELD ACCESS' })).toBeVisible()
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
