import { expect, test } from '@playwright/test'
import { INSURANCE_DENIAL_SOURCE, createInsuranceDenialPlan } from '../../src/carry-forward/fixtures'
import { compileCarryForwardDemo, mockCarryForwardCompiler, openCarryForwardPreview } from '../fixtures/carryForward'

const seedKey = 'bad-day-receipt:carry-forward-seed:v1'
const storageKey = 'bad-day-receipt:carry-forward:v1'

async function seedReceipt(page: import('@playwright/test').Page, receiptId = 'BDR-TEST-001') {
  await page.addInitScript(({ key, id }) => {
    window.sessionStorage.setItem(key, JSON.stringify({ receiptId: id }))
  }, { key: seedKey, id: receiptId })
}

async function completePlan(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('radio', { name: /Member portal/ }).check()
  await page.getByRole('button', { name: /SHOW ALL CHOICES/ }).click()
  await page.getByRole('button', { name: 'Confirm choice', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Copy of the denial letter' }).check()
  await page.getByRole('checkbox', { name: 'Supporting medical records' }).check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await page.getByRole('button', { name: 'Close this task', exact: true }).click()
}

test.describe('Carry Forward authored parity', () => {
  test.beforeEach(async ({ page }) => {
    await mockCarryForwardCompiler(page)
  })

  test('receipt-origin journey preserves continuity through M12', async ({ page }) => {
    await seedReceipt(page)
    await page.goto('/carry-forward')
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M01')
    await expect(page.getByRole('heading', { name: 'You do not have to continue as though nothing happened.' })).toBeVisible()
    await expect(page.getByText('BDR-TEST-001')).toBeVisible()
    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()

    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M02')
    await page.getByLabel('WHAT STILL NEEDS DOING?').fill('Prepare and submit my insurance denial appeal')
    await page.getByRole('button', { name: /ADD TASK CONTEXT/ }).click()
    await page.getByLabel(/OPTIONAL SOURCE CONTEXT/).fill(INSURANCE_DENIAL_SOURCE)
    await page.getByRole('button', { name: /DECLARE INTERACTION BUDGET/ }).click()
    await page.getByRole('button', { name: /PREVIEW CHANGES/ }).click()

    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M05')
    await expect(page.getByRole('heading', { name: 'One Thing Mode will…' })).toBeVisible()
    await expect(page.getByText('Show one active step')).toBeVisible()
    await expect(page.getByText('Change once, then remain stable')).toBeVisible()
    await page.getByRole('button', { name: /BEGIN ONE THING MODE/ }).click()

    await page.getByRole('heading', { name: 'Pin the deadline' }).waitFor()
    expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).not.toContain(INSURANCE_DENIAL_SOURCE)

    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'WHY THIS VIEW' }).click()
    const why = page.getByRole('dialog', { name: /Why this view/ })
    await expect(why).toBeVisible()
    await expect(why.getByText('The recommended choice appears first')).toBeVisible()
    await expect(why.getByText(/Every approved alternative remains behind Show All Choices/)).toBeVisible()
    await why.getByRole('button', { name: 'RETURN TO TASK' }).click()

    await page.getByRole('radio', { name: /Member portal/ }).check()
    await page.getByRole('button', { name: /SHOW ALL CHOICES/ }).click()
    await expect(page.getByText('Mail', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm choice', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Copy of the denial letter' }).check()
    await page.getByRole('checkbox', { name: 'Supporting medical records' }).check()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Save draft', exact: true }).click()
    await page.getByRole('button', { name: 'Close this task', exact: true }).click()

    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M12')
    await expect(page.getByRole('heading', { name: 'One thing closed.' })).toBeVisible()
    await expect(page.getByText('PREPARED FOR REVIEW')).toBeVisible()
    await expect(page.getByText(/did not send, submit, file, approve, or resolve/)).toBeVisible()
    await page.getByText('OUTPUT AND FULL DETAILS').click()
    await page.getByRole('button', { name: 'SHOW COMPLETE PLAN' }).click()
    await expect(page.getByRole('dialog', { name: 'Complete plan' })).toBeVisible()
    await page.getByRole('button', { name: 'CLOSE' }).click()
    await page.locator('.cf-temporary-context button').click()
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M02')
    expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toBeNull()
  })

  test('direct entry begins at M02 without false receipt continuity', async ({ page }) => {
    await page.goto('/carry-forward')
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M02')
    await expect(page.getByRole('heading', { name: 'What still needs doing?' })).toBeVisible()
    await expect(page.getByText('TEMPORARY SERVICE ADJUSTMENT AVAILABLE')).toHaveCount(0)
    await expect(page).toHaveURL(/\/carry-forward$/)
  })

  test('dedicated M13 recovery preserves the phrase and makes no model request', async ({ page }) => {
    let requests = 0
    await page.unroute('**/api/compile-task')
    await page.route('**/api/compile-task', async (route) => { requests += 1; await route.abort() })
    await page.goto('/carry-forward')
    await page.getByLabel('WHAT STILL NEEDS DOING?').fill('Deal with that thing')
    await page.getByRole('button', { name: /ADD TASK CONTEXT/ }).click()
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M13')
    await expect(page.getByRole('heading', { name: 'The task needs one clearer action.' })).toBeVisible()
    await expect(page.getByText('Deal with that thing', { exact: true })).toBeVisible()
    await expect(page.getByText('Reply to the landlord about the repair')).toBeVisible()
    expect(requests).toBe(0)
    await page.getByRole('button', { name: /TRY AGAIN/ }).click()
    await expect(page.getByLabel('WHAT STILL NEEDS DOING?')).toHaveValue('Deal with that thing')
    await expect(page.getByLabel('WHAT STILL NEEDS DOING?')).toBeFocused()
  })

  test('choice disclosure keeps alternatives keyboard-accessible and deterministic', async ({ page }) => {
    await compileCarryForwardDemo(page)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByText('Mail', { exact: true })).toHaveCount(0)
    const showAll = page.getByRole('button', { name: /SHOW ALL CHOICES/ })
    await showAll.focus()
    await page.keyboard.press('Enter')
    const mail = page.getByRole('radio', { name: /Mail/ })
    await expect(mail).toBeVisible()
    await mail.focus()
    await page.keyboard.press('Space')
    await expect(mail).toBeChecked()
  })

  test('disabling fewer decisions shows all approved choices without disclosure', async ({ page }) => {
    await page.goto('/carry-forward')
    await page.getByLabel('WHAT STILL NEEDS DOING?').fill('Prepare and submit my insurance denial appeal')
    await page.getByRole('button', { name: /ADD TASK CONTEXT/ }).click()
    await page.getByLabel(/OPTIONAL SOURCE CONTEXT/).fill(INSURANCE_DENIAL_SOURCE)
    await page.getByRole('button', { name: /DECLARE INTERACTION BUDGET/ }).click()
    await page.getByRole('checkbox', { name: /Fewer decisions/ }).uncheck()
    await page.getByRole('button', { name: /PREVIEW CHANGES/ }).click()
    await expect(page.getByText('Show all approved choices')).toBeVisible()
    await page.getByRole('button', { name: /BEGIN ONE THING MODE/ }).click()
    await page.getByRole('heading', { name: 'Pin the deadline' }).waitFor()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByText('Member portal', { exact: true })).toBeVisible()
    await expect(page.getByText('Mail', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /SHOW ALL CHOICES/ })).toHaveCount(0)
  })

  test('compile cancellation returns to M05 and ignores a late response', async ({ page }) => {
    await page.unroute('**/api/compile-task')
    await page.route('**/api/compile-task', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan: createInsuranceDenialPlan(), meta: { model: 'gpt-5.6-sol-test', repaired: false } }) })
    })
    await openCarryForwardPreview(page)
    await page.getByRole('button', { name: /BEGIN ONE THING MODE/ }).click()
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M06')
    await page.getByRole('button', { name: 'CANCEL' }).click()
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M05')
    await expect(page.getByRole('heading', { name: 'One Thing Mode will…' })).toBeFocused()
    await expect(page.getByText('Show one active step')).toBeVisible()
    await page.waitForTimeout(900)
    await expect(page.locator('.cf-app')).toHaveAttribute('data-screen', 'M05')
    expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toBeNull()
  })

  test('End Mode during compilation clears temporary context and returns to receipt origin', async ({ page }) => {
    await page.unroute('**/api/compile-task')
    await page.route('**/api/compile-task', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000))
      await route.abort()
    })
    await seedReceipt(page, 'BDR-END-001')
    await page.goto('/carry-forward')
    await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
    await page.getByLabel('WHAT STILL NEEDS DOING?').fill('Prepare and submit my insurance denial appeal')
    await page.getByRole('button', { name: /ADD TASK CONTEXT/ }).click()
    await page.getByLabel(/OPTIONAL SOURCE CONTEXT/).fill(INSURANCE_DENIAL_SOURCE)
    await page.getByRole('button', { name: /DECLARE INTERACTION BUDGET/ }).click()
    await page.getByRole('button', { name: /PREVIEW CHANGES/ }).click()
    await page.getByRole('button', { name: /BEGIN ONE THING MODE/ }).click()
    await page.getByRole('button', { name: 'END MODE' }).first().click()
    await expect(page).toHaveURL(/\/$/)
    expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toBeNull()
  })

  test('restores M12 after refresh without duplicate completion telemetry', async ({ page }) => {
    await page.addInitScript(() => {
      const existing = Number(window.sessionStorage.getItem('cf-completed-events') ?? '0')
      window.sessionStorage.setItem('cf-completed-events', String(existing))
      window.addEventListener('bad-day-receipt:telemetry', (event) => {
        const detail = (event as CustomEvent<{ name?: string }>).detail
        if (detail?.name === 'carry_forward_completed') {
          const count = Number(window.sessionStorage.getItem('cf-completed-events') ?? '0')
          window.sessionStorage.setItem('cf-completed-events', String(count + 1))
        }
      })
    })
    await compileCarryForwardDemo(page)
    await completePlan(page)
    await expect(page.getByRole('heading', { name: 'One thing closed.' })).toBeVisible()
    expect(await page.evaluate(() => window.sessionStorage.getItem('cf-completed-events'))).toBe('1')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'One thing closed.' })).toBeVisible()
    expect(await page.evaluate(() => window.sessionStorage.getItem('cf-completed-events'))).toBe('1')
  })
})
