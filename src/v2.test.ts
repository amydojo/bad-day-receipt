import { describe, expect, it } from 'vitest'
import type { ReceiptItem } from './types'
import {
  HISTORY_KEY,
  createSavedTransaction,
  getDailyItem,
  getExportDimensions,
  getLiveSummary,
  getStickyBarState,
  readHistory,
  writeHistory,
} from './v2'

const items: ReceiptItem[] = [
  { id: 'worry', label: 'One unnecessary worry', amount: 8.75, kind: 'charge', quantity: 1 },
  { id: 'food', label: 'Ate something', amount: -6, kind: 'credit', quantity: 1 },
]

function makeStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    values,
  }
}

describe('v2 live transaction', () => {
  it('calculates live totals and sticky bar state', () => {
    const summary = getLiveSummary(items)
    expect(summary.itemCount).toBe(2)
    expect(summary.total).toBeCloseTo(3.49375)

    expect(getStickyBarState(items, false)).toMatchObject({
      shouldStick: true,
      actionLabel: 'VIEW PRINTER',
    })
    expect(getStickyBarState(items, true).shouldStick).toBe(false)
  })
})

describe('daily register special', () => {
  it('is deterministic for the same local date', () => {
    const date = new Date(2026, 6, 13, 12, 0, 0)
    expect(getDailyItem(date)).toEqual(getDailyItem(date))
  })

  it('rotates across dates', () => {
    const ids = new Set(
      Array.from({ length: 14 }, (_, index) => getDailyItem(new Date(2026, 6, 1 + index)).id),
    )
    expect(ids.size).toBeGreaterThan(1)
  })
})

describe('local transaction drawer', () => {
  it('stores only the latest five unique receipts', () => {
    const storage = makeStorage()
    for (let index = 0; index < 7; index += 1) {
      writeHistory(createSavedTransaction({
        receiptNumber: `BD-13-${1000 + index}`,
        themeId: 'original',
        themeName: 'Original Thermal',
        total: index,
        itemCount: 2,
        status: 'survivable',
        shareCopy: 'evidence',
      }), storage)
    }

    const history = readHistory(storage)
    expect(history).toHaveLength(5)
    expect(history[0].receiptNumber).toBe('BD-13-1006')
    expect(storage.values.has(HISTORY_KEY)).toBe(true)
  })
})

describe('social export dimensions', () => {
  it('uses exact share and story formats', () => {
    expect(getExportDimensions('share')).toEqual({ width: 1080, height: 1350 })
    expect(getExportDimensions('story')).toEqual({ width: 1080, height: 1920 })
    expect(getExportDimensions('full', 720, 2400)).toEqual({ width: 720, height: 2400 })
  })
})
