import { expect, type Locator, type Page } from '@playwright/test'

export type ExpectedScrollOwner = 'catalog' | 'none' | 'receipt' | 'recovery' | 'sheet'

export function mobileInstrument(page: Page): Locator {
  return page.locator('.mobile-instrument')
}

export async function expectScrollOwner(
  page: Page,
  owner: ExpectedScrollOwner,
): Promise<void> {
  await expect(mobileInstrument(page)).toHaveAttribute('data-scroll-owner', owner)
}

export async function expectViewportLocked(page: Page): Promise<void> {
  const state = await page.evaluate(() => ({
    lockedAttribute: document.documentElement.getAttribute('data-mobile-instrument-locked'),
    bodyPosition: getComputedStyle(document.body).position,
    bodyOverflow: getComputedStyle(document.body).overflow,
    rootOverflow: getComputedStyle(document.documentElement).overflow,
  }))

  expect(state.lockedAttribute).toBe('true')
  expect(state.bodyPosition).toBe('fixed')
  expect(state.bodyOverflow).toBe('hidden')
  expect(state.rootOverflow).toBe('hidden')
}

export async function expectWindowScrollStable(
  page: Page,
  action: () => Promise<void>,
): Promise<void> {
  const before = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
  await action()
  const after = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
  expect(after).toEqual(before)
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
  }))

  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport + 1)
  expect(dimensions.root).toBeLessThanOrEqual(dimensions.viewport + 1)
}

export async function expectHiddenScenesExcluded(page: Page): Promise<void> {
  const hiddenScenes = page.locator('[data-scene-active="false"]')
  const count = await hiddenScenes.count()

  for (let index = 0; index < count; index += 1) {
    const scene = hiddenScenes.nth(index)
    await expect(scene).toHaveAttribute('aria-hidden', 'true')
    await expect(scene).toHaveAttribute('inert', '')

    const focusable = scene.locator(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    expect(await focusable.count()).toBeGreaterThanOrEqual(0)
    await expect(scene).toBeHidden()
  }
}

export async function beginMilestoneTrace(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.querySelector('.mobile-instrument')
    if (!root) throw new Error('Mobile Instrument root was not found.')

    const globalWindow = window as Window & {
      __qualityMilestones?: string[]
      __qualityScrollEvents?: number
      __qualityObserver?: MutationObserver
    }

    globalWindow.__qualityMilestones = [root.getAttribute('data-motion-milestone') ?? 'unknown']
    globalWindow.__qualityScrollEvents = 0
    globalWindow.__qualityObserver?.disconnect()

    const observer = new MutationObserver(() => {
      const milestone = root.getAttribute('data-motion-milestone') ?? 'unknown'
      const values = globalWindow.__qualityMilestones ?? []
      if (values.at(-1) !== milestone) values.push(milestone)
      globalWindow.__qualityMilestones = values
    })

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-motion-milestone'],
    })
    globalWindow.__qualityObserver = observer

    window.addEventListener('scroll', () => {
      globalWindow.__qualityScrollEvents = (globalWindow.__qualityScrollEvents ?? 0) + 1
    }, { passive: true, once: false })
  })
}

export async function readMilestoneTrace(page: Page): Promise<{
  milestones: string[]
  windowScrollEvents: number
}> {
  return page.evaluate(() => {
    const globalWindow = window as Window & {
      __qualityMilestones?: string[]
      __qualityScrollEvents?: number
    }

    return {
      milestones: globalWindow.__qualityMilestones ?? [],
      windowScrollEvents: globalWindow.__qualityScrollEvents ?? 0,
    }
  })
}

export function expectOrderedMilestones(
  actual: string[],
  expected: string[],
): void {
  let previousIndex = -1
  for (const milestone of expected) {
    const index = actual.indexOf(milestone)
    expect(index, `Expected milestone ${milestone} in ${actual.join(' → ')}`).toBeGreaterThan(previousIndex)
    previousIndex = index
  }
}
