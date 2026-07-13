import { currency, summarizeReceipt } from './receipt'
import { getThemeItemLabel, getThemeStatus, type ReceiptTheme } from './themes'
import type { ReceiptItem } from './types'

export function renderReceiptCanvas(
  items: ReceiptItem[],
  receiptNumber: string,
  theme: ReceiptTheme,
): HTMLCanvasElement {
  const summary = summarizeReceipt(items)
  const width = 1000
  const lineHeight = 42
  const couponHeight = theme.coupons ? theme.coupons.length * 210 + 150 : 0
  const height = 820 + items.length * lineHeight + couponHeight
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.fillStyle = theme.palette.paper
  ctx.fillRect(0, 0, width, height)
  drawThemeFrame(ctx, width, height, theme)

  ctx.fillStyle = theme.palette.ink
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  ctx.font = '700 22px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(theme.eyebrow, width / 2, 62)
  ctx.font = theme.titleFont
  ctx.fillText(theme.title, width / 2, 104)
  ctx.font = '700 19px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(theme.department, width / 2, 180)

  ctx.textAlign = 'left'
  ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace'
  const date = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())
  ctx.fillText(date.toUpperCase(), 70, 232)
  ctx.textAlign = 'right'
  ctx.fillText(receiptNumber, width - 70, 232)
  ctx.textAlign = 'left'
  ctx.fillText(theme.servedBy, 70, 266)

  ctx.strokeStyle = theme.palette.ink
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(70, 316)
  ctx.lineTo(width - 70, 316)
  ctx.stroke()

  let y = 352
  ctx.font = theme.bodyFont
  items.forEach((item) => {
    ctx.textAlign = 'left'
    ctx.fillText(getThemeItemLabel(item, theme).toUpperCase().slice(0, 34), 70, y)
    ctx.textAlign = 'right'
    ctx.fillText(currency(item.amount), width - 70, y)
    y += lineHeight
  })

  y += 8
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.moveTo(70, y)
  ctx.lineTo(width - 70, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 34

  const totalRows: Array<[string, string]> = [
    ['DAMAGE SUBTOTAL', currency(summary.charges)],
    [theme.taxLabel, currency(summary.emotionalTax)],
    [theme.creditLabel, currency(-summary.credits)],
  ]
  ctx.font = theme.bodyFont
  totalRows.forEach(([label, amount]) => {
    ctx.textAlign = 'left'
    ctx.fillText(label, 70, y)
    ctx.textAlign = 'right'
    ctx.fillText(amount, width - 70, y)
    y += 36
  })

  ctx.font = theme.id === 'luxury'
    ? '700 30px Georgia, Times New Roman, serif'
    : '900 28px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textAlign = 'left'
  ctx.fillText(theme.totalLabel, 70, y + 12)
  ctx.textAlign = 'right'
  ctx.fillText(currency(summary.total), width - 70, y + 12)
  y += 82

  ctx.save()
  ctx.translate(width / 2, y + 22)
  ctx.rotate(theme.id === 'government' ? -0.018 : -0.035)
  ctx.strokeStyle = theme.palette.accent
  ctx.lineWidth = 5
  ctx.strokeRect(-290, -30, 580, 62)
  ctx.fillStyle = theme.palette.accent
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 24px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(getThemeStatus(summary.status, theme).toUpperCase(), 0, 0)
  ctx.restore()
  y += 96

  ctx.fillStyle = theme.palette.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace'
  theme.notes.forEach((note, index) => ctx.fillText(note, width / 2, y + index * 30))
  y += 112

  if (theme.coupons) {
    ctx.fillStyle = theme.palette.accent
    ctx.fillRect(70, y, width - 140, 50)
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 22px Arial, Helvetica, sans-serif'
    ctx.fillText('YOUR ABSURDLY LONG COUPONS', width / 2, y + 13)
    y += 76

    theme.coupons.forEach((coupon) => {
      ctx.strokeStyle = theme.palette.ink
      ctx.lineWidth = 2
      ctx.setLineDash([8, 7])
      ctx.strokeRect(70, y, width - 140, 178)
      ctx.setLineDash([])

      ctx.fillStyle = theme.palette.accent
      ctx.font = '800 15px Arial, Helvetica, sans-serif'
      ctx.fillText(coupon.eyebrow, width / 2, y + 18)
      ctx.font = '900 30px Arial, Helvetica, sans-serif'
      ctx.fillText(coupon.headline, width / 2, y + 46)
      ctx.font = '900 21px Arial, Helvetica, sans-serif'
      ctx.fillText(coupon.detail, width / 2, y + 84)

      ctx.fillStyle = theme.palette.ink
      ctx.font = '14px Arial, Helvetica, sans-serif'
      drawWrappedText(ctx, coupon.finePrint, width / 2, y + 118, 720, 17)

      ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.fillText(coupon.code, width / 2, y + 156)
      y += 210
    })
  }

  const barcodeY = y + 12
  ctx.fillStyle = theme.palette.ink
  for (let x = 170; x < width - 170; x += 13) {
    const barWidth = x % 4 === 0 ? 7 : 4
    const barHeight = x % 3 === 0 ? 66 : 54
    ctx.fillRect(x, barcodeY, barWidth, barHeight)
  }

  return canvas
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  })
  if (line) lines.push(line)

  lines.slice(0, 2).forEach((value, index) => {
    ctx.fillText(value, x, y + index * lineHeight)
  })
}

function drawThemeFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ReceiptTheme,
) {
  if (theme.id === 'cvs') {
    ctx.fillStyle = theme.palette.accent
    ctx.fillRect(0, 0, width, 22)
    ctx.fillRect(0, height - 22, width, 22)

    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.strokeStyle = theme.palette.ink
    ctx.lineWidth = 1
    for (let y = 34; y < height - 34; y += 5) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (theme.id === 'government') {
    ctx.strokeStyle = theme.palette.ink
    ctx.lineWidth = 4
    ctx.strokeRect(32, 32, width - 64, height - 64)
    ctx.font = '900 34px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillStyle = theme.palette.accent
    ctx.textAlign = 'right'
    ctx.fillText('BD-17', width - 58, 48)
  }

  if (theme.id === 'luxury') {
    ctx.strokeStyle = theme.palette.accent
    ctx.lineWidth = 2
    ctx.strokeRect(38, 38, width - 76, height - 76)
    ctx.strokeRect(48, 48, width - 96, height - 96)
  }

  if (theme.id === 'victorian') {
    ctx.strokeStyle = theme.palette.ink
    ctx.lineWidth = 3
    ctx.strokeRect(28, 28, width - 56, height - 56)
    ctx.lineWidth = 1
    ctx.strokeRect(40, 40, width - 80, height - 80)
    ctx.textAlign = 'center'
    ctx.fillStyle = theme.palette.accent
    ctx.font = '700 42px Georgia, Times New Roman, serif'
    ctx.fillText('✦', width / 2, 34)
  }
}
