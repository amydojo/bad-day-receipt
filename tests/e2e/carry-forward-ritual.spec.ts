import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { commitTransaction, openMachine } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

const enabled = process.env.VITE_THREE_ENDINGS === 'true'
const checkpointKey = 'bad-day-receipt:carry-ritual-checkpoint:v1'

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

async function expectCheckpoint(page: Page, phase: string) {
  await expect.poll(async () => page.evaluate(({ key }) => {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw).phase : null
  }, { key: checkpointKey })).toBe(phase)

  const raw = await page.evaluate(({ key }) => window.sessionStorage.getItem(key) ?? '', { key: checkpointKey })
  expect(raw).not.toContain('Reply to the insurance denial')
  expect(raw).not.toContain('Prepare questions for the clinic')
  expect(raw).not.toContain('Private source')
  expect(raw).not.toContain('policies')
  expect(raw).not.toContain('expiresAt')
}

async function expectSameNode(handle: Awaited<ReturnType<ReturnType<Page['locator']>['elementHandle']>>, selector: string) {
  expect(await handle?.evaluate((node, expectedSelector) => (
    node.isConnected && node === document.querySelector(expectedSelector)
  ), selector)).toBe(true)
}

test.describe('Carry Forward physical ritual', () => {
  test.skip(!enabled, 'Carry Forward ritual requires VITE_THREE_ENDINGS=true')
  test.setTimeout(70_000)

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockPlatformApis(page)
  })

  test('transforms the same receipt, printer, and stub without calling the compiler', async ({ page }) => {
    let compilerCalls = 0
    await page.route('**/api/compile-task', async (route) => {
      compilerCalls += 1
      await route.abort('blockedbyclient')
    })

    await reachRitual(page)
    const printerHandle = await page.locator('[data-printer-shell]').elementHandle()
    const receiptHandle = await page.locator('[data-receipt-artifact]').elementHandle()
    const stub = page.locator('[data-carry-forward-stub]')
    const stubHandle = await stub.elementHandle()
    const stubId = await stub.getAttribute('data-stub-id')
    await expectCheckpoint(page, 'extension-ready')

    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await expect(page.getByRole('heading', { name: 'Reinsert the same stub.' })).toBeFocused()
    await expectCheckpoint(page, 'stub-separated')
    await expectSameNode(stubHandle, '[data-carry-forward-stub]')
    await expectSameNode(printerHandle, '[data-printer-shell]')

    await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
    const actuator = page.getByRole('button', { name: 'Push actuator to convert' })
    await expect(actuator).toBeVisible()
    await expectCheckpoint(page, 'actuator-ready')
    await actuator.click()

    await expect(page.getByText('FIELD TRANSFER · 027', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('This task no longer needs to ask for full capacity.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'APPLY' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'ADJUST' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'CANCEL' })).toBeVisible()
    await expectCheckpoint(page, 'transfer-issued')
    await expect(stub).toHaveAttribute('data-stub-id', stubId ?? '')
    await expect(page.locator('[data-field-transfer]')).toHaveAttribute('data-source-stub-id', stubId ?? '')
    await expectSameNode(stubHandle, '[data-carry-forward-stub]')
    await expectSameNode(receiptHandle, '[data-receipt-artifact]')
    await expectSameNode(printerHandle, '[data-printer-shell]')
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

  test('releasing the tear early keeps the extension attached and reversible', async ({ page }) => {
    await reachRitual(page)
    const receiptHandle = await page.locator('[data-receipt-artifact]').elementHandle()
    const stubHandle = await page.locator('[data-carry-forward-stub]').elementHandle()
    const stub = page.locator('[data-carry-forward-stub]')
    const box = await stub.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 18, box.y + box.height / 2 + 8, { steps: 3 })
    await page.mouse.up()

    await expect(page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' })).toBeVisible()
    await expectCheckpoint(page, 'extension-ready')
    await expectSameNode(stubHandle, '[data-carry-forward-stub]')
    await expectSameNode(receiptHandle, '[data-receipt-artifact]')
  })

  test('stable checkpoints cover intake recovery and refresh returns to the completed receipt', async ({ page }) => {
    await reachRitual(page, 'Prepare questions for the clinic')
    const stub = page.locator('[data-carry-forward-stub]')
    const stubHandle = await stub.elementHandle()
    await expectCheckpoint(page, 'extension-ready')

    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await expectCheckpoint(page, 'stub-separated')
    const separatedBox = await stub.boundingBox()
    expect(separatedBox).not.toBeNull()
    if (!separatedBox) return

    await page.mouse.move(separatedBox.x + separatedBox.width / 2, separatedBox.y + separatedBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(separatedBox.x + separatedBox.width / 2, separatedBox.y + separatedBox.height / 2 - 32, { steps: 4 })
    await page.mouse.up()

    await expect(page.getByText('The intake did not capture the stub. The same separated stub is still available.', { exact: true })).toBeVisible()
    await expectCheckpoint(page, 'recovery')
    await page.getByRole('button', { name: 'RECOVER SAME STUB' }).click()
    await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
    await expect(page.getByRole('button', { name: 'Push actuator to convert' })).toBeVisible()
    await expectCheckpoint(page, 'actuator-ready')
    await page.getByRole('button', { name: 'Push actuator to convert' }).click()
    await expect(page.locator('[data-field-transfer-issued="true"]')).toBeVisible({ timeout: 10_000 })
    await expectCheckpoint(page, 'transfer-issued')
    expect(stubHandle).not.toBeNull()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
    await expect(page.locator('[data-receipt-artifact]')).toBeVisible()
    await expect(page.locator('[data-carry-forward-stub]')).toHaveCount(0)
    await expectCheckpoint(page, 'transfer-issued')
    await page.setViewportSize({ width: 667, height: 375 })
  })

  test('conversion failure recovers to actuator-ready without invalidating the receipt', async ({ page }) => {
    await page.goto('/?carry-ritual-fixture=conversion-failure')
    await expect(page.locator('[data-machine-id="bad-day-receipt"]')).toBeVisible()
    await commitTransaction(page)
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused({ timeout: 20_000 })
    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
    await page.getByLabel('ONE REMAINING OBLIGATION').fill('Reply to the insurance denial')
    await page.getByRole('button', { name: 'USE THIS ONE' }).click()
    await page.getByRole('button', { name: 'REVIEW ONE THING MODE' }).click()
    await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()

    const printerHandle = await page.locator('[data-printer-shell]').elementHandle()
    const receiptHandle = await page.locator('[data-receipt-artifact]').elementHandle()
    await page.getByRole('button', { name: 'Push actuator to convert' }).click()
    await expect(page.getByText('Conversion did not register. The same stub can return to the actuator-ready boundary.', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expectCheckpoint(page, 'recovery')
    await page.getByRole('button', { name: 'RECOVER SAME STUB' }).click()
    await expect(page.getByRole('button', { name: 'Push actuator to convert' })).toBeVisible()
    await expectCheckpoint(page, 'actuator-ready')
    await expectSameNode(receiptHandle, '[data-receipt-artifact]')
    await expectSameNode(printerHandle, '[data-printer-shell]')
  })

  test('Adjust and Cancel clear checkpoints without invalidating the completed receipt', async ({ page }) => {
    await reachActuator(page)
    const receiptHandle = await page.locator('[data-receipt-artifact]').elementHandle()
    await page.getByRole('button', { name: 'Push actuator to convert' }).click()
    await expect(page.getByRole('button', { name: 'ADJUST' })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'ADJUST' }).click()
    await expect(page.getByRole('heading', { name: 'Approve how this task should ask less of you.' })).toBeFocused()
    await expect.poll(() => page.evaluate(({ key }) => window.sessionStorage.getItem(key), { key: checkpointKey })).toBeNull()

    await page.getByRole('button', { name: 'ISSUE ADJUSTMENT' }).click()
    await page.getByRole('button', { name: 'TEAR CARRY FORWARD STUB' }).click()
    await page.getByRole('button', { name: 'REINSERT SAME STUB' }).click()
    await page.getByRole('button', { name: 'Push actuator to convert' }).click()
    await expect(page.getByRole('button', { name: 'CANCEL' })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'CANCEL' }).click()
    await expect(page.getByRole('heading', { name: 'The day is documented.' })).toBeFocused()
    await expect.poll(() => page.evaluate(({ key }) => window.sessionStorage.getItem(key), { key: checkpointKey })).toBeNull()
    await expectSameNode(receiptHandle, '[data-receipt-artifact]')
  })
})
