import { themes } from './themes'
import './cvs-realism.css'

declare module './themes' {
  interface ReceiptTheme {
    couponLines?: string[]
  }
}

const cvsTheme = themes.find((theme) => theme.id === 'cvs')

if (cvsTheme) {
  cvsTheme.couponLines = cvsTheme.coupons?.map(
    (coupon) => `${coupon.headline} — ${coupon.detail}`,
  ) ?? []
}
