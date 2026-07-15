import { expect, test } from '@playwright/test'
import {
  choosePaper,
  openMachine,
  selectOneAdditionalCharge,
  waitForComplete,
} from '../fixtures/machine'
import { mockPlatformApis, seedMachineStorage } from '../fixtures/platformApis'
import {
  beginMilestoneTrace,
  expectHiddenScenesExcluded,
  expectNoHorizontalOverflow,
  expectOrderedMilestones,
  expectScrollOwner,
  expectViewportLocked,
  expectWindowScrollStable,
  mobileInstrument,
  readMilestoneTrace,
} from '../fixtures/qualityAssertions'

test.describe('Mobile Instrument release quality gate', () => {
  test.setTimeout(45_000)

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile Instrument ownership is covered by mobile browser projects.')
    await mockPlatformApis(page)
  })

  test('preserves scroll ownership and legal phase order through a standard transaction', async ({ page }) => {
    await openMachine(page)

    await expect(mobileInstrument(page)).toHaveAttribute('data-mobile-scene', 'compose')
    await expectScrollOwner(page, 'compose')
    await expectViewportLocked(page)
    await expectHiddenScenesExcluded(page)
    await expectNoHorizontalOverflow(page)

    await selectOneAdditionalCharge(page)
    await beginMilestoneTrace(page)

    const initialScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
    const commit = page.getByTestId('mobile-commit')
    await expect(commit).toBeVisible()

    await commit.evaluate((element) => {
      element.click()
      element.click()
      element.click()
    })

    await expect(mobileInstrument(page)).toHaveAttribute('data-mobile-scene', 'printing')
    await expectScrollOwner(page, 'none')
    await expectViewportLocked(page)
    await expectHiddenScenesExcluded(page)

    await waitForComplete(page)

    await expect(mobileInstrument(page)).toHaveAttribute('data-mobile-scene', 'artifact')
    await expectScrollOwner(page, 'receipt')
    await expectViewportLocked(page)
    await expectNoHorizontalOverflow(page)

    const finalScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
    expect(finalScroll).toEqual(initialScroll)

    const trace = await readMilestoneTrace(page)
    expectOrderedMilestones(trace.milestones, [
      'compose',
      'chamber',
      'scanning',
      'printer-wake',
      'feeding',
      'verdict',
      'artifact',
    ])
    expect(trace.milestones.filter((value) => value === 'scanning')).toHaveLength(1)
    expect(trace.windowScrollEvents).toBe(0)

    const receiptViewport = page.getByRole('region', { name: /Completed receipt/ })
    await expect(receiptViewport).toBeVisible()
    await expectWindowScrollStable(page, async () => {
      await receiptViewport.evaluate((element) => {
        element.scrollTop = Math.min(80, element.scrollHeight - element.clientHeight)
        element.dispatchEvent(new Event('scroll'))
      })
    })

    await page.getByRole('button', { name: 'NEW', exact: true }).click()
    await expect(mobileInstrument(page)).toHaveAttribute('data-mobile-scene', 'compose')
    await expectScrollOwner(page, 'compose')
    await expect(page.locator('.choice-chip:focus')).toHaveCount(1)
  })

  test('preserves the CVS false ending, restart, and internal artifact scroll', async ({ page }) => {
    await openMachine(page)
    await choosePaper(page, 'CVS')
    await beginMilestoneTrace(page)

    const initialScroll = await page.evaluate(() => window.scrollY)
    await page.getByTestId('mobile-commit').click()
    await waitForComplete(page)

    const trace = await readMilestoneTrace(page)
    expectOrderedMilestones(trace.milestones, [
      'compose',
      'chamber',
      'scanning',
      'printer-wake',
      'feeding',
      'apparent-complete',
      'coupon-feeding',
      'verdict',
      'artifact',
    ])
    expect(trace.milestones.filter((value) => value === 'apparent-complete')).toHaveLength(1)
    expect(trace.milestones.filter((value) => value === 'coupon-feeding')).toHaveLength(1)
    expect(trace.windowScrollEvents).toBe(0)

    await expectScrollOwner(page, 'receipt')
    const receiptViewport = page.getByRole('region', { name: /Completed receipt/ })
    await receiptViewport.evaluate((element) => {
      element.scrollTop = element.scrollHeight
      element.dispatchEvent(new Event('scroll'))
    })
    await expect(page.getByText('100%', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll)
  })

  test('gives an open sheet temporary ownership without leaking body styles', async ({ page }) => {
    await openMachine(page)
    await expectScrollOwner(page, 'compose')

    await page.locator('.mobile-machine-tools').getByRole('button', { name: /SETTINGS/ }).click()
    await expect(page.getByRole('dialog', { name: 'Machine settings' })).toBeVisible()
    await expectScrollOwner(page, 'sheet')
    await expectViewportLocked(page)

    await page.getByRole('button', { name: 'Close Machine settings' }).click()
    await expect(page.getByRole('dialog', { name: 'Machine settings' })).toHaveCount(0)
    await expectScrollOwner(page, 'compose')
    await expectViewportLocked(page)
  })

  test('recovers from malformed local persistence without abandoning the instrument', async ({ page }) => {
    await seedMachineStorage(page, {
      draft: 'not-an-array',
      themeId: 'not-a-theme',
      history: [{ broken: true }],
      preferences: null,
    })

    await openMachine(page)
    await expect(mobileInstrument(page)).toHaveAttribute('data-mobile-scene', 'compose')
    await expect(page.getByTestId('mobile-commit')).toBeVisible()
    await expectScrollOwner(page, 'compose')
    await expectViewportLocked(page)
  })
})
