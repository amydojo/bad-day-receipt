import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { MachineSensoryDirector } from '../../mobile-instrument/sensory/sensoryTypes'
import { getTheme } from '../../themes'
import { createCompletedReceiptSnapshot } from '../completedReceipt'
import type { ReceiptEndingState } from '../receiptEndingTypes'
import { ArchivalSleeve } from './ArchivalSleeve'
import { KeepReceiptRitual } from './KeepReceiptRitual'

const receipt = createCompletedReceiptSnapshot({
  receiptNumber: 'BD-20-0820',
  completedAt: '2026-07-20T12:00:00.000Z',
  theme: getTheme('original'),
  items: [{ id: 'normal', label: 'Trying to act normal', amount: 14, kind: 'charge', quantity: 1 }],
  total: 15.19,
  itemCount: 1,
  status: 'documented',
  anomaly: null,
  shareCopy: 'Local only.',
})

const sensory: MachineSensoryDirector = {
  prime: vi.fn(),
  emit: vi.fn(),
  updatePreferences: vi.fn(),
  reset: vi.fn(),
  dispose: vi.fn(),
}

const noop = () => undefined
const commit = () => ({ status: 'saved' as const })
const exportCopy = async () => true

function renderState(state: Extract<ReceiptEndingState, { kind: 'keep-ritual' | 'keep-recovery' }>) {
  return renderToStaticMarkup(
    <KeepReceiptRitual
      state={state}
      dispatch={noop}
      reducedMotion={false}
      sensory={sensory}
      onCommitArchive={commit}
      onExportLocalCopy={exportCopy}
      onClose={noop}
    />,
  )
}

describe('KeepReceiptRitual', () => {
  it('starts automatic preservation without Back, Continue, or utility actions', () => {
    const html = renderState({
      kind: 'keep-ritual',
      receipt,
      phase: 'cut',
      archiveAttempt: 1,
    })

    expect(html).toContain('PRESERVING THE RECORD')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('BACK')
    expect(html).not.toContain('CONTINUE')
    expect(html).not.toContain('EXPORT')
    expect(html).not.toContain('SHARE')
  })

  it('renders truthful completion copy only for the persisted complete phase', () => {
    const ritual = renderState({
      kind: 'keep-ritual',
      receipt,
      phase: 'archive-closing',
      archiveAttempt: 1,
      archivedAt: '2026-07-20T12:05:00.000Z',
    })
    const completion = renderState({
      kind: 'keep-ritual',
      receipt,
      phase: 'complete',
      archiveAttempt: 1,
      archivedAt: '2026-07-20T12:05:00.000Z',
    })

    expect(ritual).not.toContain('Receipt kept with care.')
    expect(ritual).not.toContain('is stored privately')
    expect(completion).toContain('Receipt kept with care.')
    expect(completion).toContain('Receipt BD-20-0820 is stored privately.')
    expect(completion).toContain('>CLOSE<')
    expect(completion).not.toContain('CARRY FORWARD')
    expect(completion).not.toContain('CREATE ANOTHER')
  })

  it('renders dignified storage recovery with all three explicit choices', () => {
    const html = renderState({
      kind: 'keep-recovery',
      receipt,
      reason: 'storage-write-failed',
      archiveAttempt: 1,
    })

    expect(html).toContain('The receipt is still here.')
    expect(html).toContain('Nothing has been lost.')
    expect(html).toContain('TRY PRIVATE ARCHIVE AGAIN')
    expect(html).toContain('EXPORT A LOCAL COPY')
    expect(html).toContain('RETURN TO THE DOCUMENTED RECEIPT')
    expect(html).not.toContain('stored privately')
    expect(html).not.toContain('Oops')
  })

  it('keeps the sleeve separate, decorative, and visible only in material phases', () => {
    const hidden = renderToStaticMarkup(<ArchivalSleeve phase="cut" />)
    const receiving = renderToStaticMarkup(<ArchivalSleeve phase="sleeve-receiving" />)
    const recovery = renderToStaticMarkup(<ArchivalSleeve recovery />)

    expect(hidden).toContain('data-sleeve-state="hidden"')
    expect(receiving).toContain('data-sleeve-state="receiving"')
    expect(recovery).toContain('data-sleeve-state="recovery"')
    expect(receiving).toContain('aria-hidden="true"')
    expect(receiving).not.toContain('BAD DAY RECEIPT')
  })
})
