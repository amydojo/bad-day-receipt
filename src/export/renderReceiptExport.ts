import { renderExportCanvas } from '../socialExports'
import type { ReceiptTheme } from '../themes'
import type { ReceiptItem } from '../types'
import type { ExportFormat } from '../v2'
import type { ArtifactExport } from './exportTypes'

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('EXPORT_FAILED'))
    }, 'image/png')
  })
}

export function createArtifactFilename(format: ExportFormat, date = new Date()): string {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const suffix = format === 'full' ? '' : `-${format}`
  return `bad-day-receipt${suffix}-${day}.png`
}

export async function createReceiptArtifactExport({
  items,
  receiptNumber,
  theme,
  format,
  shareText,
  date,
}: {
  items: ReceiptItem[]
  receiptNumber: string
  theme: ReceiptTheme
  format: ExportFormat
  shareText: string
  date?: Date
}): Promise<ArtifactExport> {
  const canvas = renderExportCanvas(items, receiptNumber, theme, format)
  const blob = await canvasToBlob(canvas)
  const filename = createArtifactFilename(format, date)
  const file = new File([blob], filename, { type: 'image/png' })

  return {
    file,
    filename,
    mimeType: 'image/png',
    width: canvas.width,
    height: canvas.height,
    shareText,
    format,
  }
}
