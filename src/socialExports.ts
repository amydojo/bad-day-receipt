import { renderReceiptCanvas } from './receiptCanvas'
import type { ReceiptTheme } from './themes'
import type { ReceiptItem } from './types'
import { getExportDimensions, type ExportFormat } from './v2'

export function renderExportCanvas(
  items: ReceiptItem[],
  receiptNumber: string,
  theme: ReceiptTheme,
  format: ExportFormat,
): HTMLCanvasElement {
  const source = renderReceiptCanvas(items, receiptNumber, theme)
  if (format === 'full') return source

  const { width, height } = getExportDimensions(format, source.width, source.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.fillStyle = theme.palette.paper
  ctx.fillRect(0, 0, width, height)

  const margin = format === 'story' ? 90 : 64
  const usableWidth = width - margin * 2
  const usableHeight = height - margin * 2
  const scale = Math.min(usableWidth / source.width, usableHeight / source.height)
  const drawWidth = source.width * scale
  const drawHeight = source.height * scale
  const x = (width - drawWidth) / 2
  const y = format === 'story' ? 150 : (height - drawHeight) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(25, 20, 14, 0.16)'
  ctx.shadowBlur = 28
  ctx.shadowOffsetY = 14
  ctx.drawImage(source, x, y, drawWidth, drawHeight)
  ctx.restore()

  ctx.fillStyle = theme.palette.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 18px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText('SOFT MACHINE 001 · BAD DAY RECEIPT', width / 2, 42)
  ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText('bad-day-receipt.vercel.app', width / 2, height - 34)

  if (format === 'share' && theme.id === 'cvs') {
    ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText('7 ADDITIONAL COUPONS OMITTED FOR PUBLIC SAFETY', width / 2, height - 68)
  }

  return canvas
}

export function downloadExport(
  items: ReceiptItem[],
  receiptNumber: string,
  theme: ReceiptTheme,
  format: ExportFormat,
): void {
  const canvas = renderExportCanvas(items, receiptNumber, theme, format)
  const link = document.createElement('a')
  link.download = `bad-day-receipt-${theme.id}-${format}-${receiptNumber.toLowerCase()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
