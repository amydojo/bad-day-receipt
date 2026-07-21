import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MachineSensoryDirector } from '../../mobile-instrument/sensory/sensoryTypes'
import { getTheme } from '../../themes'
import { ReceiptArtifact } from '../ReceiptArtifact'
import { createCompletedReceiptSnapshot } from '../completedReceipt'
import type { ReceiptEndingState } from '../receiptEndingTypes'
import { ReleaseReceiptRitual } from './ReleaseReceiptRitual'
import { ThermalUnprintLayer } from './ThermalUnprintLayer'

const receipt = createCompletedReceiptSnapshot({
  receiptNumber: 'BD-20-0083',
  completedAt: '2026-07-20T12:00:00.000Z',
  theme: getTheme('original'),
  items: [
    { id: 'first', label: 'First record', amount: 4, kind: 'charge', quantity: 1 },
    { id: 'last', label: 'Last record', amount: 6, kind: 'charge', quantity: 1 },
  ],
  total: 10.85,
  itemCount: 2,
  status: 'dented but operational',
  anomaly: null,
  shareCopy: 'Local only.',
})

const sensory: MachineSensoryDirector = {
  prime: () => undefined,
  emit: () => undefined,
  updatePreferences: () => undefined,
  reset: () => undefined,
  dispose: () => undefined,
}

const sharedProps = {
  dispatch: () => undefined,
  headingRef: { current: null },
  reducedMotion: false,
  sensory,
  onCommitRelease: () => ({ status: 'saved' as const }),
  onUndoRelease: () => ({ status: 'saved' as const, destination: 'documented' as const }),
  onExpireRelease: () => undefined,
  onExportLocalCopy: async () => true,
  onReturnToSource: () => undefined,
}

describe('ReleaseReceiptRitual', () => {
  it('renders no controls during automatic choreography', () => {
    const state: ReceiptEndingState = {
      kind: 'release-ritual',
      receipt,
      phase: 'unprint-lines',
      releaseAttempt: 1,
      origin: { kind: 'pending' },
    }
    const html = renderToStaticMarkup(<ReleaseReceiptRitual {...sharedProps} state={state} />)
    expect(html).toContain('data-release-phase="unprint-lines"')
    expect(html).not.toContain('<button')
    expect(html).toContain('Releasing the receipt.')
  })

  it('shows only Undo after a persistence-confirmed release', () => {
    const state: ReceiptEndingState = {
      kind: 'release-ritual',
      receipt,
      phase: 'complete',
      releaseAttempt: 1,
      origin: { kind: 'pending' },
      undoUntil: '2026-07-20T12:05:08.000Z',
    }
    const html = renderToStaticMarkup(<ReleaseReceiptRitual {...sharedProps} state={state} />)
    expect(html).toContain('The day can end here.')
    expect(html).toContain('Nothing has been added to tomorrow.')
    expect(html).toContain('UNDO RELEASE')
    expect(html.match(/<button/g)).toHaveLength(1)
    expect(html).not.toContain('EXPORT')
    expect(html).not.toContain('CARRY')
  })

  it('distinguishes initial release failure from failed Undo', () => {
    const releaseFailure: ReceiptEndingState = {
      kind: 'release-recovery',
      receipt,
      reason: 'storage-write-failed',
      operation: 'release',
      releaseAttempt: 1,
      origin: { kind: 'pending' },
    }
    const undoFailure: ReceiptEndingState = {
      kind: 'release-recovery',
      receipt,
      reason: 'storage-write-failed',
      operation: 'undo',
      releaseAttempt: 1,
      origin: { kind: 'pending' },
      undoUntil: '2026-07-20T12:05:08.000Z',
    }
    const releaseHtml = renderToStaticMarkup(<ReleaseReceiptRitual {...sharedProps} state={releaseFailure} />)
    const undoHtml = renderToStaticMarkup(<ReleaseReceiptRitual {...sharedProps} state={undoFailure} />)
    expect(releaseHtml).toContain('Nothing has been removed.')
    expect(releaseHtml).toContain('TRY RELEASE AGAIN')
    expect(undoHtml).toContain('The receipt is ready to return.')
    expect(undoHtml).toContain('TRY UNDO AGAIN')
    expect(undoHtml).toContain('RETURN TO RELEASED RECEIPT')
  })

  it('keeps semantic receipt regions and one non-semantic thermal layer', () => {
    const html = renderToStaticMarkup(
      <div>
        <ReceiptArtifact
          items={receipt.items}
          receiptNumber={receipt.receiptNumber}
          theme={getTheme(receipt.themeId)}
          phase="complete"
          visibleLineCount={receipt.items.length}
          visibleTotalRows={4}
          showVerdict
          couponProgress={1}
          printedAt={receipt.completedAt}
          endingState="release-ritual"
          releasePhase="unprint-lines"
        />
        <ThermalUnprintLayer phase="unprint-lines" />
      </div>,
    )
    expect(html.match(/data-receipt-artifact=/g)).toHaveLength(1)
    expect(html).toContain('data-release-region="total"')
    expect(html).toContain('data-release-region="receipt-number"')
    expect(html).toContain('data-release-region="acknowledgment"')
    expect(html).toContain('data-release-rank="2"')
    expect(html).toContain('data-release-rank="1"')
    expect(html.match(/thermal-unprint-layer/g)?.length).toBeGreaterThan(0)
  })
})
