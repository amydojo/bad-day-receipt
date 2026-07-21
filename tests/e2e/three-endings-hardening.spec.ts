import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'
import {
  CARRY_RITUAL_CHECKPOINT_KEY,
  dispatchPointerCancel,
  seedMalformedCarryCheckpoint,
  setBrowserZoom,
} from '../fixtures/threeEndingsFaults'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

async function expectNoBlockingAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const blocking = results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([])
}

async function reachDocumented(page: Page) {
  await openMachine(page)
  await commitTransaction(page)
  await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
}

async function reachRitual(page: Page, task = 'Reply to the insurance denial') {
  await reachDocumented(page)
  await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
  await page.getByLabel('ONE REMAINING OBLIGATION').fill(task)
  await page.getByRole('button', { name: 'USE THIS ONE' }).click()
  await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
  await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
  await expect(page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' })).toBeVisible({ timeout: 10_000 })
}

async function reachActuator(page: Page) {
  await reachRitual(page)
  await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
  await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
  await expect(page.getByRole('button', { name: 'Push actuator to convert' })).toBeVisible({ timeout: 10_000 })
}

test.describe('Three Endings gaps-only hardening', () => {
  test.skip(!enabled, 'Hardening matrix requires VITE_THREE_ENDINGS=true')
  test.setTimeout(80_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('refresh reconciles a stable Carry checkpoint without restoring private task text', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await reachRitual(page, 'Prepare questions for the clinic')
    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await expect.poll(async () => page.evaluate((key) => {
      const raw = sessionStorage.getItem(key)
      return raw ? JSON.parse(raw).phase : null
    }, CARRY_RITUAL_CHECKPOINT_KEY)).toBe('stub-separated')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'The receipt is still complete.' })).toBeFocused({ timeout: 20_000 })
    await expect(page.locator('[data-receipt-artifact]')).toBeVisible()
    await expect(page.locator('[data-carry-forward-stub]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'START CARRY FORWARD AGAIN' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'RETURN TO COMPLETED RECEIPT' })).toBeVisible()

    const checkpoint = await page.evaluate((key) => sessionStorage.getItem(key) ?? '', CARRY_RITUAL_CHECKPOINT_KEY)
    expect(checkpoint).not.toContain('Prepare questions for the clinic')
    expect(checkpoint).not.toContain('sourceText')
    expect(checkpoint).not.toContain('policies')

    await page.getByRole('button', { name: 'RETURN TO COMPLETED RECEIPT' }).click()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect(page.evaluate((key) => sessionStorage.getItem(key), CARRY_RITUAL_CHECKPOINT_KEY)).resolves.toBeNull()
  })

  test('malformed or foreign Carry checkpoints fail closed without fabricating receipt provenance', async ({ page }) => {
    await seedMalformedCarryCheckpoint(page, {
      version: 1,
      phase: 'actuator-medium',
      receiptId: 'FOREIGN-RECEIPT',
      stubId: 'forged-stub',
      actuatorMilestone: 'medium',
      recoveryReason: null,
    })
    await reachDocumented(page)
    await expect(page.locator('[data-carry-checkpoint-recovery]')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect(page.evaluate((key) => sessionStorage.getItem(key), CARRY_RITUAL_CHECKPOINT_KEY)).resolves.toBeNull()
  })

  test('pointer cancellation returns the actuator to a safe boundary with keyboard parity and a quiet exit', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await reachActuator(page)
    const actuator = page.getByRole('button', { name: 'Push actuator to convert' })
    const box = await actuator.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 88, { steps: 5 })
    await dispatchPointerCancel(page, '[data-carry-actuator]')
    await page.mouse.up()

    await expect(page.getByRole('button', { name: 'RESET ACTUATOR' })).toBeVisible()
    await expect(page.locator('[data-receipt-artifact]')).toBeVisible()
    await page.getByRole('button', { name: 'RESET ACTUATOR' }).click()
    await actuator.press('Space')
    await expect(page.locator('[data-field-transfer-issued="true"]')).toBeVisible({ timeout: 10_000 })
  })

  test('live reduced-motion changes preserve the same Carry semantic sequence', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await reachRitual(page)
    await expect(page.locator('[data-carry-ritual]')).not.toHaveAttribute('data-reduced-motion', 'true')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('[data-carry-ritual]')).toHaveAttribute('data-reduced-motion', 'true')
    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
    await page.getByRole('button', { name: 'Push actuator to convert' }).press('Enter')
    await expect(page.locator('[data-field-transfer-issued="true"]')).toBeVisible({ timeout: 10_000 })
  })

  test('documented decisions pass axe, 320px reflow, touch-target, zoom, and landscape checks', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await reachDocumented(page)
    await expectNoBlockingAxeViolations(page)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    const targets = await page.locator('[data-decision-choice]').evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }))
    for (const target of targets) {
      expect(target.height).toBeGreaterThanOrEqual(44)
      expect(target.width).toBeGreaterThanOrEqual(44)
    }

    await setBrowserZoom(page, 2)
    const carry = page.getByRole('button', { name: /CARRY ONE THING FORWARD/ })
    await carry.scrollIntoViewIfNeeded()
    await expect(carry).toBeVisible()

    await page.setViewportSize({ width: 667, height: 375 })
    const endHere = page.getByRole('button', { name: /END THE DAY HERE/ })
    await endHere.scrollIntoViewIfNeeded()
    await expect(endHere).toBeVisible()
  })

  test('direct Carry Forward remains truthful and accessible without receipt provenance', async ({ page }) => {
    await page.goto('/carry-forward')
    await expect(page.getByRole('heading', { name: 'What is still asking something from you?' })).toBeVisible()
    await expect(page.locator('[data-receipt-artifact]')).toHaveCount(0)
    await expect(page.locator('[data-printer-continuity]')).toHaveCount(0)
    await expectNoBlockingAxeViolations(page)
  })
})
