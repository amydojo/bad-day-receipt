import { useMemo, useRef, useState } from 'react'
import type { ArtifactActionResult, ArtifactExport } from '../export/exportTypes'
import type { ExportFormat } from '../v2'
import {
  copyArtifactText,
  createBrowserArtifactPlatform,
  saveArtifact,
  shareArtifact,
  type ArtifactPlatform,
} from './artifactActions'

interface ArtifactActionsProps {
  shareText: string
  createExport: (format: ExportFormat) => Promise<ArtifactExport>
  onArchive?: () => void
  onReset: () => void
  onReprint: () => void
  onMore?: () => void
  platform?: ArtifactPlatform
}

export function ArtifactActions({
  shareText,
  createExport,
  onArchive,
  onReset,
  onReprint,
  onMore,
  platform,
}: ArtifactActionsProps) {
  const browserPlatform = useMemo(
    () => platform ?? createBrowserArtifactPlatform(),
    [platform],
  )
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [message, setMessage] = useState('')
  const activeJob = useRef(false)

  const runExportAction = async (
    name: string,
    format: ExportFormat,
    deliver: (artifact: ArtifactExport) => Promise<ArtifactActionResult> | ArtifactActionResult,
  ) => {
    if (activeJob.current) return
    activeJob.current = true
    setBusyAction(name)
    setMessage('')
    const progressTimer = window.setTimeout(() => setShowProgress(true), 300)

    try {
      const artifact = await createExport(format)
      const result = await deliver(artifact)
      setMessage(resultMessage(result))
    } catch {
      setMessage('EXPORT JAMMED · THE RECEIPT IS SAFE')
    } finally {
      window.clearTimeout(progressTimer)
      setShowProgress(false)
      setBusyAction(null)
      activeJob.current = false
    }
  }

  const copyText = async () => {
    if (activeJob.current) return
    activeJob.current = true
    setBusyAction('copy')
    const result = await copyArtifactText(shareText, browserPlatform)
    setMessage(resultMessage(result))
    setBusyAction(null)
    activeJob.current = false
  }

  return (
    <section className="artifact-actions" aria-label="Receipt actions" aria-busy={Boolean(busyAction)}>
      <div className="artifact-action-primary">
        <button
          type="button"
          disabled={Boolean(busyAction)}
          onClick={() => {
            void runExportAction('share', 'share', (artifact) => shareArtifact(artifact, browserPlatform))
          }}
        >
          SHARE
        </button>
        <button
          type="button"
          disabled={Boolean(busyAction)}
          onClick={() => {
            void runExportAction('save', 'full', (artifact) => saveArtifact(artifact, browserPlatform))
          }}
        >
          SAVE
        </button>
        {onArchive && (
          <button type="button" disabled={Boolean(busyAction)} onClick={onArchive}>
            ADD TO DOJO ARCHIVE
          </button>
        )}
        {onMore ? (
          <button type="button" disabled={Boolean(busyAction)} onClick={onMore}>
            MORE
          </button>
        ) : (
          <button type="button" disabled={Boolean(busyAction)} onClick={() => { void copyText() }}>
            COPY TEXT
          </button>
        )}
        <button type="button" disabled={Boolean(busyAction)} onClick={onReset}>
          NEW
        </button>
      </div>

      {!onMore && (
        <div className="artifact-format-actions" aria-label="Additional export formats">
          <button
            type="button"
            disabled={Boolean(busyAction)}
            onClick={() => {
              void runExportAction('share-card', 'share', (artifact) => saveArtifact(artifact, browserPlatform))
            }}
          >
            SAVE 4:5
          </button>
          <button
            type="button"
            disabled={Boolean(busyAction)}
            onClick={() => {
              void runExportAction('story', 'story', (artifact) => saveArtifact(artifact, browserPlatform))
            }}
          >
            SAVE 9:16
          </button>
          <button type="button" disabled={Boolean(busyAction)} onClick={onReprint}>
            REPRINT
          </button>
        </div>
      )}

      <p className="artifact-action-status" aria-live="polite">
        {showProgress ? 'PREPARING EVIDENCE…' : message}
      </p>
    </section>
  )
}

function resultMessage(result: ArtifactActionResult): string {
  switch (result.status) {
    case 'shared': return 'SHARE SHEET OPENED'
    case 'saved': return 'EVIDENCE SAVED'
    case 'copied': return 'COPIED TO CLIPBOARD'
    case 'canceled': return 'SHARE CANCELED · NOTHING WAS POSTED'
    case 'failed': return result.code === 'COPY_FAILED'
      ? 'COPY FAILED · SELECT THE TEXT MANUALLY'
      : 'EXPORT JAMMED · THE RECEIPT IS SAFE'
  }
}
