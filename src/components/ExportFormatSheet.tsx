import type { ExportFormat } from '../v2'

const formats: Array<{
  id: ExportFormat
  label: string
  detail: string
}> = [
  { id: 'full', label: 'FULL RECEIPT', detail: 'Complete artifact at natural height' },
  { id: 'share', label: 'SHARE CARD', detail: '1080 × 1350 · 4:5' },
  { id: 'story', label: 'STORY STRIP', detail: '1080 × 1920 · 9:16' },
]

export function ExportFormatSheet({
  busy,
  onSave,
}: {
  busy: boolean
  onSave: (format: ExportFormat) => void
}) {
  return (
    <div className="sheet-export-list">
      {formats.map((format) => (
        <button
          type="button"
          key={format.id}
          disabled={busy}
          onClick={() => onSave(format.id)}
        >
          <strong>{format.label}</strong>
          <small>{format.detail}</small>
        </button>
      ))}
    </div>
  )
}
