import type { ReceiptTheme } from '../themes'
import type { ExportFormat } from '../v2'
import { FIELD_RELEASE_REGION, fieldReleaseStamp } from './fieldRelease'
import type { FieldAccessContext } from './fieldAccessTypes'

export function applyFieldAccessProvenance(
  source: HTMLCanvasElement,
  format: ExportFormat,
  theme: ReceiptTheme,
  context: FieldAccessContext | null,
): HTMLCanvasElement {
  if (!context) return source
  if (format === 'full') return appendReceiptProvenance(source, theme, context)

  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return source

  ctx.drawImage(source, 0, 0)
  const stripHeight = 84
  ctx.fillStyle = theme.palette.ink
  ctx.fillRect(0, canvas.height - stripHeight, canvas.width, stripHeight)
  ctx.fillStyle = theme.palette.paper
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(
    `GENERATED THROUGH LD–001   ${fieldReleaseStamp(context.edition)}`,
    canvas.width / 2,
    canvas.height - 53,
  )
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(
    `${FIELD_RELEASE_REGION} FIELD RELEASE`,
    canvas.width / 2,
    canvas.height - 27,
  )

  return canvas
}

function appendReceiptProvenance(
  source: HTMLCanvasElement,
  theme: ReceiptTheme,
  context: FieldAccessContext,
): HTMLCanvasElement {
  const footerHeight = 100
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height + footerHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return source

  ctx.fillStyle = theme.palette.paper
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0)
  ctx.strokeStyle = theme.palette.ink
  ctx.lineWidth = Math.max(1, Math.round(canvas.width / 420))
  ctx.beginPath()
  ctx.moveTo(24, source.height + 1)
  ctx.lineTo(canvas.width - 24, source.height + 1)
  ctx.stroke()

  ctx.fillStyle = theme.palette.ink
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = '700 12px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText('GENERATED THROUGH LD–001', 28, source.height + 29)
  ctx.textAlign = 'right'
  ctx.fillText(fieldReleaseStamp(context.edition), canvas.width - 28, source.height + 29)
  ctx.textAlign = 'center'
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(`${FIELD_RELEASE_REGION} FIELD RELEASE`, canvas.width / 2, source.height + 66)

  return canvas
}
