import type { ExportFormat } from '../v2'

export interface ArtifactExport {
  file: File
  filename: string
  mimeType: 'image/png'
  width: number
  height: number
  shareText: string
  format: ExportFormat
}

export type ArtifactActionResult =
  | { status: 'shared' }
  | { status: 'saved' }
  | { status: 'copied' }
  | { status: 'canceled' }
  | { status: 'failed'; code: 'EXPORT_FAILED' | 'SHARE_FAILED' | 'COPY_FAILED' }
