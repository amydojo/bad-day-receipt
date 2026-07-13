import { describe, expect, it } from 'vitest'
import { getTheme, getThemeItemLabel, getThemeStatus } from './themes'
import type { ReceiptItem } from './types'

const worry: ReceiptItem = {
  id: 'worry',
  label: 'One unnecessary worry',
  amount: 8.75,
  kind: 'charge',
  quantity: 1,
}

describe('receipt themes', () => {
  it('translates known line items into theme language', () => {
    expect(getThemeItemLabel(worry, getTheme('cvs'))).toBe('UNNECESSARY WORRY 1CT')
  })

  it('preserves custom line item labels', () => {
    const custom = { ...worry, id: 'custom-1', label: 'Cat knocked over water' }
    expect(getThemeItemLabel(custom, getTheme('victorian'))).toBe('Cat knocked over water')
  })

  it('translates the receipt verdict', () => {
    expect(getThemeStatus('system under load', getTheme('government'))).toBe('priority review authorized')
  })
})
