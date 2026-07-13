import { describe, expect, it } from 'vitest'
import { getTheme, getThemeItemLabel, getThemeStatus } from './themes'
import type { ReceiptItem } from './types'
const worry: ReceiptItem={id:'worry',label:'One unnecessary worry',amount:8.75,kind:'charge',quantity:1}
describe('receipt themes',()=>{
  it('translates known line items',()=>expect(getThemeItemLabel(worry,getTheme('cvs'))).toBe('UNNECESSARY WORRY 1CT'))
  it('preserves custom labels',()=>expect(getThemeItemLabel({...worry,id:'custom-1',label:'Cat knocked over water'},getTheme('victorian'))).toBe('Cat knocked over water'))
  it('translates verdicts',()=>expect(getThemeStatus('system under load',getTheme('government'))).toBe('priority review authorized'))
  it('ships a properly excessive CVS coupon tail',()=>expect(getTheme('cvs').coupons).toHaveLength(7))
  it('gives every CVS coupon realistic microcopy',()=>expect(getTheme('cvs').coupons?.every(c=>c.code&&c.finePrint&&c.detail)).toBe(true))
})
