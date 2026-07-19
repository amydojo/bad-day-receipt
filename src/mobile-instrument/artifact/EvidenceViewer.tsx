import {
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { createDojoArchiveHandoffUrl } from '../../dojoLab'
import { saveReceiptSeed } from '../../carry-forward/carryForwardStorage'
import type { ArtifactExport } from '../../export/exportTypes'
import { ArtifactActions } from '../../soft-machine/ArtifactActionDock'
import {
  copyArtifactText,
  createBrowserArtifactPlatform,
  saveArtifact,
} from '../../soft-machine/artifactActions'
import { MachineBottomSheet } from '../../soft-machine/MachineBottomSheet'
import type { ExportFormat } from '../../v2'
import { EvidenceMoreSheet } from './EvidenceMoreSheet'
import { PinnedPrinterHead } from './PinnedPrinterHead'
import { ReceiptScrollViewport } from './ReceiptScrollViewport'

export function EvidenceViewer({
  paperName,
  receiptNumber,
  headingRef,
  printerHead,
  receipt,
  shareText,
  createExport,
  onNew,
  onReprint,
}: {
  paperName: string
  receiptNumber: string
  headingRef: Ref<HTMLElement>
  printerHead: ReactNode
  receipt: ReactNode
  shareText: string
  createExport: (format: ExportFormat) => Promise<ArtifactExport>
  onNew: () => void
  onReprint: () => void
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const platform = useMemo(createBrowserArtifactPlatform, [])
  const archiveHref = useMemo(() => createDojoArchiveHandoffUrl({
    receiptNumber,
    paperName,
    shareText,
  }), [paperName, receiptNumber, shareText])
  const [moreOpen, setMoreOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const saveFormat = async (format: ExportFormat) => {
    if (busy) return
    setBusy(true)
    setMessage('PREPARING EVIDENCE…')
    try {
      const artifact = await createExport(format)
      const result = saveArtifact(artifact, platform)
      setMessage(result.status === 'saved'
        ? 'EVIDENCE SAVED'
        : 'EXPORT JAMMED · THE RECEIPT IS SAFE')
    } catch {
      setMessage('EXPORT JAMMED · THE RECEIPT IS SAFE')
    } finally {
      setBusy(false)
    }
  }

  const copyText = async () => {
    if (busy) return
    setBusy(true)
    const result = await copyArtifactText(shareText, platform)
    setMessage(result.status === 'copied'
      ? 'COPIED TO CLIPBOARD'
      : 'COPY FAILED · SELECT THE TEXT MANUALLY')
    setBusy(false)
  }

  const reprint = () => {
    setMoreOpen(false)
    onReprint()
  }

  return (
    <section
      className="evidence-viewer"
      aria-labelledby="evidence-viewer-heading"
      data-evidence-viewer="true"
    >
      <div ref={surfaceRef} className="evidence-viewer__surface">
        <PinnedPrinterHead ref={headingRef as Ref<HTMLHeadingElement>} paperName={paperName}>
          {printerHead}
        </PinnedPrinterHead>

        <ReceiptScrollViewport resetKey={receiptNumber}>
          {receipt}
        </ReceiptScrollViewport>

        <footer className="evidence-viewer__dock">
          <ArtifactActions
            shareText={shareText}
            createExport={createExport}
            onArchive={() => window.location.assign(archiveHref)}
            onReset={onNew}
            onReprint={onReprint}
            onMore={() => setMoreOpen(true)}
          />
          <button
            type="button"
            className="cf-entry-link cf-entry-link--receipt"
            onClick={() => {
              saveReceiptSeed(window.sessionStorage, receiptNumber)
              window.location.assign('/carry-forward')
            }}
          >
            CARRY ONE THING FORWARD
          </button>
        </footer>
      </div>

      <MachineBottomSheet
        open={moreOpen}
        title="More evidence actions"
        description="Copy, reprint, or save an alternate artifact format."
        onClose={() => setMoreOpen(false)}
        isolateRef={surfaceRef}
      >
        <EvidenceMoreSheet
          receiptNumber={receiptNumber}
          paperName={paperName}
          busy={busy}
          onSave={(format) => { void saveFormat(format) }}
          onCopy={() => { void copyText() }}
          onReprint={reprint}
        />
        <p className="machine-sheet-status" aria-live="polite">{message}</p>
      </MachineBottomSheet>
    </section>
  )
}
