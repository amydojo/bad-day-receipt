import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { commitTransaction, openMachine, waitForComplete } from '../fixtures/machine'
import { mockPlatformApis } from '../fixtures/platformApis'

async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const blocking = results.violations.filter((violation) => (
    violation.impact === 'critical' || violation.impact === 'serious'
  ))

  expect(blocking, blocking.map((violation) => (
    `${violation.id}: ${violation.help}\n${violation.nodes.map((node) => node.target.join(' ')).join('\n')}`
  )).join('\n\n')).toEqual([])
}

test.describe('@accessibility accessibility release gate', () => {
  test.setTimeout(45_000)

  test.beforeEach(async ({ page }) => {
    await mockPlatformApis(page)
  })

  test('Compose has no serious automated accessibility violations', async ({ page }) => {
    await openMachine(page)
    await expectNoSeriousAccessibilityViolations(page)
  })

  test('Printing excludes hidden scenes and remains accessible', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Printing scene isolation is a mobile instrument contract.')

    await openMachine(page)
    await commitTransaction(page)
    await expect(page.locator('.mobile-instrument')).toHaveAttribute('data-mobile-scene', 'printing')
    await expectNoSeriousAccessibilityViolations(page)
  })

  test('Evidence Viewer and its More sheet pass the automated gate', async ({ page }) => {
    await openMachine(page)
    await commitTransaction(page)
    await waitForComplete(page)
    await expectNoSeriousAccessibilityViolations(page)

    await page.getByRole('button', { name: 'MORE', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'More evidence actions' })).toBeVisible()
    await expectNoSeriousAccessibilityViolations(page)
  })
})
