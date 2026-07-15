import { expect, test } from '@playwright/test'
import { choosePaper, commitTransaction, openMachine, waitForComplete } from '../fixtures/machine'

test('preserves false completion and the separate CVS coupon feed', async ({ page }) => {
  await openMachine(page)
  await choosePaper(page, 'CVS')

  await page.evaluate(() => {
    const phases: string[] = []
    const machine = document.querySelector('.receipt-machine')
    if (!machine) return
    const capture = () => phases.push(machine.getAttribute('data-phase') ?? '')
    capture()
    const observer = new MutationObserver(capture)
    observer.observe(machine, { attributes: true, attributeFilter: ['data-phase'] })
    Object.assign(window, { __badDayPhases: phases, __badDayObserver: observer })
  })

  await commitTransaction(page)
  await waitForComplete(page)

  const phases = await page.evaluate(() => (
    (window as typeof window & { __badDayPhases?: string[] }).__badDayPhases ?? []
  ))
  expect(phases).toContain('falseComplete')
  expect(phases).toContain('printingCoupons')
  expect(phases.indexOf('falseComplete')).toBeLessThan(phases.indexOf('printingCoupons'))
  expect(phases.indexOf('printingCoupons')).toBeLessThan(phases.indexOf('complete'))

  await expect(page.locator('.coupon-tail .coupon')).toHaveCount(7)

  const reader = page.getByRole('region', { name: /Completed receipt/ })
  await expect(reader).toBeVisible()
  const metrics = await reader.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)

  await reader.evaluate((element) => {
    element.scrollTop = element.scrollHeight
    element.dispatchEvent(new Event('scroll'))
  })
  expect(await reader.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
})
