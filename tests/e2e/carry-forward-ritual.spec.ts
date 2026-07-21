import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'

async function reachRitual(page: Page, task = 'Reply to the insurance denial') {
  await openMachine(page)
  await commitTransaction(page)
  await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
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

async function assertNoBlockingAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.filter((violation) => (
    violation.impact === 'critical' || violation.impact === 'serious'
  ))).toEqual([])
}

test.describe('Carry Forward physical ritual', () => {
  test.skip(!enabled, 'Carry Forward ritual requires VITE_THREE_ENDINGS=true')
  test.setTimeout(45_000)

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockPlatformApis(page)
  })

  test('transforms the same stub into a Field Transfer without calling the compiler', async ({ page }) => {
    let compilerCalls = 0
    await page.route('**/api/compile-task', async (route) => {
      compilerCalls += 1
      await route.abort('blockedbyclient')
    })

    await reachRitual(page)
    const receiptHandle = await page.locator('[data-receipt-artifact]').elementHandle()
    const stub = page.locator('[data-carry-forward-stub]')
    const stubHandle = await stub.elementHandle()
    const stubId = await stub.getAttribute('data-stub-id')

    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await expect(page.getByRole('heading', { name: 'Reinsert the same stub.' })).toBeFocused()
    expect(await stubHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-carry-forward-stub]')
    ))).toBe(true)

    await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
    const actuator = page.getByRole('button', { name: 'Push actuator to convert' })
    await expect(actuator).toBeVisible()
    await actuator.click()

    await expect(page.getByText('FIELD TRANSFER · 027', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('This task no longer needs to ask for full capacity.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'APPLY' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'ADJUST' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'CANCEL' })).toBeVisible()
    await expect(stub).toHaveAttribute('data-stub-id', stubId ?? '')
    await expect(page.locator('[data-field-transfer]')).toHaveAttribute('data-source-stub-id', stubId ?? '')
    expect(await stubHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-carry-forward-stub]')
    ))).toBe(true)
    expect(await receiptHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-receipt-artifact]')
    ))).toBe(true)
    expect(compilerCalls).toBe(0)
    await assertNoBlockingAxeViolations(page)
  })

  test('an early actuator release springs safely to zero and keyboard fallback completes', async ({ page }) => {
    await reachActuator(page)
    const actuator = page.getByRole('button', { name: 'Push actuator to convert' })
    const box = await actuator.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 105, { steps: 6 })
    await page.mouse.up()

    await expect(page.getByRole('button', { name: 'RESET ACTUATOR' })).toBeVisible()
    await expect(page.getByText('The handle returned to zero. The receipt and stub are unchanged.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'RESET ACTUATOR' }).click()
    await expect(actuator).toBeEnabled()
    await actuator.press('Space')
    await expect(page.getByText('FIELD TRANSFER · 027', { exact: true })).toBeVisible({ timeout: 10_000 })
  })

  test('drag tear works and an intake miss recovers the same separated stub', async ({ page }) => {
    await reachRitual(page, 'Prepare questions for the clinic')
    const stub = page.locator('[data-carry-forward-stub]')
    const stubHandle = await stub.elementHandle()
    const box = await stub.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 105, box.y + box.height / 2 + 40, { steps: 6 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: 'REINSERT SAME STUB' })).toBeVisible()

    const separatedBox = await stub.boundingBox()
    expect(separatedBox).not.toBeNull()
    if (!separatedBox) return
    await page.mouse.move(separatedBox.x + separatedBox.width / 2, separatedBox.y + separatedBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(separatedBox.x + separatedBox.width / 2, separatedBox.y + separatedBox.height / 2 - 32, { steps: 4 })
    await page.mouse.up()

    await expect(page.getByText('The intake did not capture the stub. The same separated stub is still available.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'RECOVER SAME STUB' }).click()
    await expect(page.getByRole('button', { name: 'REINSERT SAME STUB' })).toBeVisible()
    await page.setViewportSize({ width: 667, height: 375 })
    expect(await stubHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-carry-forward-stub]')
    ))).toBe(true)
  })

  test('Adjust and Cancel return without invalidating the completed receipt', async ({ page }) => {
    await reachActuator(page)
    const receiptHandle = await page.locator('[data-receipt-artifact]').elementHandle()
    await page.getByRole('button', { name: 'Push actuator to convert' }).click()
    await expect(page.getByRole('button', { name: 'ADJUST' })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'ADJUST' }).click()
    await expect(page.getByRole('heading', { name: 'Approve how this task should ask less of you.' })).toBeFocused()

    await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
    await page.getByRole('button', { name: 'Push actuator to convert' }).click()
    await expect(page.getByRole('button', { name: 'CANCEL' })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'CANCEL' }).click()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    expect(await receiptHandle?.evaluate((node) => (
      node.isConnected && node === document.querySelector('[data-receipt-artifact]')
    ))).toBe(true)
  })
})
