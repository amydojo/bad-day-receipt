import type { Page } from '@playwright/test'
import {
  INSURANCE_DENIAL_SOURCE,
  INSURANCE_DENIAL_TASK,
  createInsuranceDenialPlan,
} from '../../src/carry-forward/fixtures'

export async function mockCarryForwardCompiler(page: Page) {
  await page.route('**/api/compile-task', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan: createInsuranceDenialPlan(),
        meta: { model: 'gpt-5.6-sol-test', repaired: false },
      }),
    })
  })
}

export async function openCarryForwardPreview(page: Page) {
  await page.goto('/carry-forward')
  await page.getByLabel('ONE CONCRETE TASK').fill(INSURANCE_DENIAL_TASK)
  await page.getByRole('button', { name: 'CONTINUE', exact: true }).click()
  await page.getByLabel('SOURCE TEXT').fill(INSURANCE_DENIAL_SOURCE)
  await page.getByRole('button', { name: 'SET INTERACTION BUDGET' }).click()
  await page.getByRole('button', { name: 'CONFIRM BUDGET' }).click()
}

export async function compileCarryForwardDemo(page: Page) {
  await openCarryForwardPreview(page)
  await page.getByRole('button', { name: 'COMPILE TASK PLAN' }).click()
  await page.getByRole('heading', { name: 'Pin the deadline' }).waitFor()
}
