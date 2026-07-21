import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { ChargeBuilder } from './components/ChargeBuilder'
import { ExportFormatSheet } from './components/ExportFormatSheet'
import { MachineSettingsSheet } from './components/MachineSettingsSheet'
import { PaperStockSheet } from './components/PaperStockSheet'
import {
  ReceiptMachine,
  type ReceiptMachineHandle,
  type ReceiptMachineStateSnapshot,
} from './components/ReceiptMachine'
import { TransactionHistorySheet } from './components/TransactionHistorySheet'
import {
  getDraftSummary,
  setDraftItemQuantity,
  snapshotDraft,
  toggleDraftItem,
} from './draftReceipt'
import type { ArtifactExport } from './export/exportTypes'
import {
  isFocusedMachinePhase,
  isReceiptEditingLocked,
} from './machinePresentation'
import {
  MobileInstrument,
  MobileInstrumentScene,
} from './mobile-instrument/MobileInstrument'
import { applyPwaUpdate, registerPwa } from './pwa'
import { catalog, currency, makeReceiptNumber } from './receipt'
import {
  createRestoredReceiptEndingState,
  receiptEndingReducer,
  THREE_ENDINGS_ENABLED,
  type ArchivedReceipt,
  type CompletedReceiptSnapshot,
  type PendingRelease,
  type ReceiptDisposition,
  type ReceiptEndingMachineState,
  type ReceiptEndingPersistenceStatus,
  type ReleaseOrigin,
} from './receipt-ending'
import { createKeepArchiveProjection } from './receipt-ending/keep/keepArchivePersistence'
import type { KeepArchiveCommitResult } from './receipt-ending/keep/KeepReceiptRitual'
import {
  commitReleaseToMachineStorage,
  expireReleaseInMachineStorage,
  undoReleaseInMachineStorage,
} from './receipt-ending/release/releaseApplicationPersistence'
import { isReleaseUndoAvailable } from './receipt-ending/release/releasePersistence'
import type {
  ReleaseCommitResult,
  UndoReleaseResult,
} from './receipt-ending/release/ReleaseReceiptRitual'
import {
  createBrowserArtifactPlatform,
  saveArtifact,
} from './soft-machine/artifactActions'
import { CommitBar } from './soft-machine/CommitBar'
import { MachineBottomSheet } from './soft-machine/MachineBottomSheet'
import {
  appendValidHistory,
  createDefaultMachineData,
  loadMachineDataResult,
  persistMachineData,
  type PendingCommit,
  type PersistedMachineData,
} from './soft-machine/persistence'
import {
  getMachineSheetTitle,
  type MachineSheetId,
} from './soft-machine/sheetState'
import { SoftMachineShell } from './soft-machine/SoftMachineShell'
import {
  getTheme,
  themes,
  type ReceiptThemeId,
} from './themes'
import type { CatalogItem, ReceiptItem } from './types'
import {
  createSavedTransaction,
  createShareCopy,
  getDailyItem,
  getRareAnomaly,
  type ExportFormat,
  type SavedTransaction,
} from './v2'

const starterIds = ['normal', 'worry', 'decisions', 'food', 'through']
const machineScenes = ['printing', 'artifact', 'recovery'] as const
const initialMachineState: ReceiptMachineStateSnapshot = {
  phase: 'idle',
  isBusy: false,
  isComplete: false,
}

function createStarterItems(): ReceiptItem[] {
  return catalog
    .filter((item) => starterIds.includes(item.id))
    .map((item) => ({ ...item, quantity: 1 }))
}

function initialReceiptEndingState(data: PersistedMachineData): ReceiptEndingMachineState {
  if (!THREE_ENDINGS_ENABLED) return null
  if (data.pendingRelease && isReleaseUndoAvailable(data.pendingRelease)) {
    return {
      kind: 'release-ritual',
      receipt: data.pendingRelease.receipt,
      phase: 'complete',
      releaseAttempt: 1,
      origin: data.pendingRelease.origin,
      undoUntil: data.pendingRelease.undoUntil,
    }
  }
  return data.pendingReceipt
    ? createRestoredReceiptEndingState(data.pendingReceipt)
    : null
}

function App() {
  const initialLoad = useMemo(
    () => loadMachineDataResult(createDefaultMachineData(createStarterItems())),
    [],
  )
  const initialPersisted = initialLoad.data
  const dailyItem = useMemo(() => getDailyItem(), [])
  const browserArtifactPlatform = useMemo(createBrowserArtifactPlatform, [])
  const [items, setItems] = useState<ReceiptItem[]>(initialPersisted.draft)
  const [receiptNumber, setReceiptNumber] = useState(makeReceiptNumber)
  const [themeId, setThemeId] = useState<ReceiptThemeId>(initialPersisted.themeId)
  const [history, setHistory] = useState<SavedTransaction[]>(initialPersisted.history)
  const [machineState, setMachineState] = useState(initialMachineState)
  const [activeSheet, setActiveSheet] = useState<MachineSheetId | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(initialPersisted.preferences.soundEnabled)
  const [hapticsEnabled, setHapticsEnabled] = useState(initialPersisted.preferences.hapticsEnabled)
  const [pendingCommit, setPendingCommit] = useState<PendingCommit | null>(null)
  const [lastCompleted, setLastCompleted] = useState<PersistedMachineData['lastCompleted']>(
    initialPersisted.lastCompleted,
  )
  const [pendingReceipt, setPendingReceipt] = useState<CompletedReceiptSnapshot | null>(
    initialPersisted.pendingReceipt,
  )
  const [pendingRelease, setPendingRelease] = useState<PendingRelease | null>(initialPersisted.pendingRelease)
  const [privateArchive, setPrivateArchive] = useState<ArchivedReceipt[]>(initialPersisted.privateArchive)
  const [receiptDispositions, setReceiptDispositions] = useState<ReceiptDisposition[]>(
    initialPersisted.receiptDispositions,
  )
  const [receiptEndingState, dispatchReceiptEnding] = useReducer(
    receiptEndingReducer,
    initialReceiptEndingState(initialPersisted),
  )
  const [receiptEndingPersistenceStatus, setReceiptEndingPersistenceStatus] = useState<ReceiptEndingPersistenceStatus>(
    initialLoad.status === 'unavailable' ? 'unavailable' : 'saved',
  )
  const [sheetExportBusy, setSheetExportBusy] = useState(false)
  const [sheetExportMessage, setSheetExportMessage] = useState('')
  const [pwaUpdate, setPwaUpdate] = useState<ServiceWorkerRegistration | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const mainRef = useRef<HTMLElement | null>(null)
  const machineRef = useRef<ReceiptMachineHandle | null>(null)
  const sheetTriggerRef = useRef<HTMLElement | null>(null)
  const machineDataRef = useRef<PersistedMachineData>(initialPersisted)

  const theme = getTheme(themeId)
  const receiptEndingActive = THREE_ENDINGS_ENABLED && receiptEndingState !== null
  const presentationPhase = receiptEndingActive ? 'complete' : machineState.phase
  const activeThemeId = receiptEndingState?.receipt.themeId ?? theme.id
  const charges = useMemo(
    () => [dailyItem, ...catalog.filter((item) => item.kind === 'charge')],
    [dailyItem],
  )
  const credits = useMemo(() => catalog.filter((item) => item.kind === 'credit'), [])
  const live = getDraftSummary(items)
  const anomaly = getRareAnomaly(receiptNumber)
  const shareCopy = createShareCopy(items, live.total, theme.name)
  const editingLocked = receiptEndingActive || isReceiptEditingLocked(machineState.phase)
  const focusedMode = isFocusedMachinePhase(presentationPhase)

  const currentMachineData: PersistedMachineData = {
    draft: items,
    themeId,
    history,
    preferences: { soundEnabled, hapticsEnabled },
    pendingCommit,
    lastCompleted,
    pendingReceipt,
    pendingRelease,
    privateArchive,
    receiptDispositions,
  }
  machineDataRef.current = currentMachineData

  useEffect(() => {
    void registerPwa({
      onUpdateAvailable: setPwaUpdate,
      onOfflineReady: () => setOfflineReady(true),
    })
  }, [])

  useEffect(() => {
    const result = persistMachineData(currentMachineData)
    setReceiptEndingPersistenceStatus(
      result.status === 'saved'
        ? 'saved'
        : result.status === 'unavailable'
          ? 'unavailable'
          : 'failed',
    )
  }, [
    hapticsEnabled,
    history,
    items,
    lastCompleted,
    pendingCommit,
    pendingReceipt,
    pendingRelease,
    privateArchive,
    receiptDispositions,
    soundEnabled,
    themeId,
  ])

  useEffect(() => {
    const current = machineDataRef.current
    if (!current.pendingRelease || isReleaseUndoAvailable(current.pendingRelease)) return
    const result = expireReleaseInMachineStorage({ current })
    if (result.status !== 'saved') return
    machineDataRef.current = result.data
    setPendingRelease(null)
    dispatchReceiptEnding({ type: 'RELEASE_UNDO_EXPIRED' })
  }, [])

  useEffect(() => {
    if (machineState.phase !== 'arming' || pendingCommit) return
    setPendingCommit({
      items: snapshotDraft(items),
      themeId,
      startedAt: new Date().toISOString(),
    })
  }, [items, machineState.phase, pendingCommit, themeId])

  const toggleItem = (catalogItem: CatalogItem) => {
    if (editingLocked) return
    setItems((current) => toggleDraftItem(current, catalogItem))
  }

  const changeQuantity = (itemId: string, quantity: number) => {
    if (editingLocked) return
    setItems((current) => setDraftItemQuantity(current, itemId, quantity))
  }

  const addCustomItem = (item: ReceiptItem) => {
    if (editingLocked) return
    setItems((current) => [...current, item])
  }

  const resetReceiptEnding = () => {
    setPendingReceipt(null)
    dispatchReceiptEnding({ type: 'CLEAR_RECEIPT_ENDING' })
  }

  const clearReceipt = () => {
    setItems([])
    setPendingCommit(null)
    resetReceiptEnding()
    setReceiptNumber(makeReceiptNumber())
    setMachineState(initialMachineState)
  }

  const focusFirstComposeControl = () => {
    window.requestAnimationFrame(() => {
      mainRef.current
        ?.querySelector<HTMLButtonElement>('.choice-chip:not(:disabled), .theme-tab:not(:disabled)')
        ?.focus()
    })
  }

  const makeAnother = () => {
    setReceiptNumber(makeReceiptNumber())
    setItems(createStarterItems())
    setPendingCommit(null)
    resetReceiptEnding()
    setMachineState(initialMachineState)
    setActiveSheet(null)
    focusFirstComposeControl()
  }

  const commitFromMobile = () => {
    if (editingLocked || items.length === 0) return
    setPendingCommit({
      items: snapshotDraft(items),
      themeId,
      startedAt: new Date().toISOString(),
    })
    machineRef.current?.ringItUp()
  }

  const recordTransaction = (completedReceiptNumber: string) => {
    const transaction = createSavedTransaction({
      receiptNumber: completedReceiptNumber,
      themeId: theme.id,
      themeName: theme.name,
      total: live.total,
      itemCount: live.itemCount,
      status: live.status,
      shareCopy,
    })
    setHistory((current) => appendValidHistory(current, transaction))
    setPendingCommit(null)
    setLastCompleted({
      receiptNumber: completedReceiptNumber,
      completedAt: new Date().toISOString(),
    })
  }

  const recordCompletedReceipt = (snapshot: CompletedReceiptSnapshot) => {
    setPendingReceipt((current) => (
      current?.receiptNumber === snapshot.receiptNumber ? current : snapshot
    ))
    dispatchReceiptEnding({ type: 'START_NEW_RECEIPT', receipt: snapshot })
    setPendingCommit(null)
    setLastCompleted({
      receiptNumber: snapshot.receiptNumber,
      completedAt: snapshot.completedAt,
    })
  }

  const commitKeepArchive = useCallback((
    receipt: CompletedReceiptSnapshot,
    archivedAt: string,
  ): KeepArchiveCommitResult => {
    const current = machineDataRef.current
    const projection = createKeepArchiveProjection({
      currentArchive: current.privateArchive,
      currentDispositions: current.receiptDispositions,
      pendingReceipt: current.pendingReceipt,
      receipt,
      archivedAt,
    })

    if (!projection) {
      setReceiptEndingPersistenceStatus('failed')
      return { status: 'failed', reason: 'archive-validation-failed' }
    }

    const nextData: PersistedMachineData = {
      ...current,
      privateArchive: projection.privateArchive,
      receiptDispositions: projection.receiptDispositions,
      pendingReceipt: projection.pendingReceipt,
    }
    const result = persistMachineData(nextData)

    if (result.status === 'saved') {
      machineDataRef.current = nextData
      setPrivateArchive(nextData.privateArchive)
      setReceiptDispositions(nextData.receiptDispositions)
      setPendingReceipt(null)
      setReceiptEndingPersistenceStatus('saved')
      return { status: 'saved' }
    }

    if (result.status === 'unavailable') {
      setReceiptEndingPersistenceStatus('unavailable')
      return { status: 'unavailable' }
    }

    setReceiptEndingPersistenceStatus('failed')
    return { status: 'failed', reason: 'storage-write-failed' }
  }, [])

  const applyReleaseData = useCallback((data: PersistedMachineData) => {
    machineDataRef.current = data
    setPendingReceipt(data.pendingReceipt)
    setPendingRelease(data.pendingRelease)
    setPrivateArchive(data.privateArchive)
    setReceiptDispositions(data.receiptDispositions)
    setReceiptEndingPersistenceStatus('saved')
  }, [])

  const commitRelease = useCallback((
    receipt: CompletedReceiptSnapshot,
    origin: ReleaseOrigin,
    undoUntil: string,
  ): ReleaseCommitResult => {
    const result = commitReleaseToMachineStorage({
      current: machineDataRef.current,
      receipt,
      origin,
      undoUntil,
    })
    if (result.status === 'saved') {
      applyReleaseData(result.data)
      return { status: 'saved' }
    }
    if (result.status === 'unavailable') {
      setReceiptEndingPersistenceStatus('unavailable')
      return { status: 'unavailable' }
    }
    setReceiptEndingPersistenceStatus('failed')
    return { status: 'failed', reason: result.reason }
  }, [applyReleaseData])

  const undoRelease = useCallback((): UndoReleaseResult => {
    const current = machineDataRef.current
    const destination = current.pendingRelease?.origin.kind === 'archive'
      ? 'archive'
      : 'documented'
    const result = undoReleaseInMachineStorage({ current })
    if (result.status === 'saved') {
      applyReleaseData(result.data)
      if (destination === 'archive') setActiveSheet('history')
      return { status: 'saved', destination }
    }
    if (result.status === 'unavailable') {
      setReceiptEndingPersistenceStatus('unavailable')
      return { status: 'unavailable' }
    }
    setReceiptEndingPersistenceStatus('failed')
    return { status: 'failed', reason: result.reason }
  }, [applyReleaseData])

  const expireRelease = useCallback(() => {
    const current = machineDataRef.current
    if (!current.pendingRelease) return
    const result = expireReleaseInMachineStorage({ current })
    if (result.status !== 'saved') return
    applyReleaseData(result.data)
  }, [applyReleaseData])

  const returnFromRelease = useCallback((origin: ReleaseOrigin) => {
    if (origin.kind === 'archive') {
      dispatchReceiptEnding({ type: 'CLEAR_RECEIPT_ENDING' })
      setActiveSheet('history')
      return
    }
    dispatchReceiptEnding({ type: 'RETURN_TO_DOCUMENTED' })
  }, [])

  const createExport = async (format: ExportFormat): Promise<ArtifactExport> => {
    const { createReceiptArtifactExport } = await import('./export/renderReceiptExport')
    return createReceiptArtifactExport({
      items,
      receiptNumber,
      theme,
      format,
      shareText: shareCopy,
    })
  }

  const createArchiveExport = useCallback(async (
    receipt: CompletedReceiptSnapshot,
    format: ExportFormat,
  ): Promise<ArtifactExport> => {
    const { createExportForCompletedReceipt } = await import('./export/renderReceiptExport')
    return createExportForCompletedReceipt(receipt, format)
  }, [])

  const exportLocalReceiptCopy = useCallback(async (
    receipt: CompletedReceiptSnapshot,
  ): Promise<boolean> => {
    try {
      const artifact = await createArchiveExport(receipt, 'full')
      return saveArtifact(artifact, browserArtifactPlatform).status === 'saved'
    } catch {
      return false
    }
  }, [browserArtifactPlatform, createArchiveExport])

  const closeKeepCompletion = () => {
    dispatchReceiptEnding({ type: 'CLOSE_KEEP_COMPLETION' })
    machineRef.current?.reset()
    setMachineState(initialMachineState)
    setPendingCommit(null)
    setReceiptNumber(makeReceiptNumber())
    setActiveSheet(null)
    focusFirstComposeControl()
  }

  const reprintArchivedReceipt = (receipt: CompletedReceiptSnapshot) => {
    machineRef.current?.reset()
    dispatchReceiptEnding({ type: 'CLEAR_RECEIPT_ENDING' })
    setPendingReceipt(null)
    setItems(receipt.items.map((item) => ({ ...item })))
    setThemeId(receipt.themeId)
    setReceiptNumber(makeReceiptNumber())
    setPendingCommit({
      items: receipt.items.map((item) => ({ ...item })),
      themeId: receipt.themeId,
      startedAt: new Date().toISOString(),
    })
    setMachineState(initialMachineState)
    setActiveSheet(null)

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => machineRef.current?.ringItUp())
    })
  }

  const releaseArchivedReceipt = (entry: ArchivedReceipt) => {
    setActiveSheet(null)
    dispatchReceiptEnding({
      type: 'START_ARCHIVED_RELEASE',
      receipt: entry.receipt,
      archivedAt: entry.archivedAt,
    })
  }

  const saveSheetExport = async (format: ExportFormat) => {
    if (sheetExportBusy) return
    setSheetExportBusy(true)
    setSheetExportMessage('PREPARING EVIDENCE…')
    try {
      const artifact = await createExport(format)
      const result = saveArtifact(artifact, browserArtifactPlatform)
      setSheetExportMessage(
        result.status === 'saved'
          ? 'EVIDENCE SAVED'
          : 'EXPORT JAMMED · THE RECEIPT IS SAFE',
      )
    } catch {
      setSheetExportMessage('EXPORT JAMMED · THE RECEIPT IS SAFE')
    } finally {
      setSheetExportBusy(false)
    }
  }

  return (
    <MobileInstrument phase={presentationPhase} theme={activeThemeId} sheetOpen={activeSheet !== null}>
      <SoftMachineShell
        machineId="bad-day-receipt"
        phase={presentationPhase}
        focused={focusedMode}
        activeTheme={activeThemeId}
      >
        <main ref={mainRef} className="app-shell v2-shell" data-active-theme={activeThemeId}>
          <MobileInstrumentScene name="compose-chrome" activeWhen="compose" className="mobile-instrument__chrome">
            {(pwaUpdate || offlineReady) && (
              <div className="pwa-status" role="status">
                <span>{pwaUpdate ? 'A FRESH PAPER ROLL IS READY' : 'MACHINE AVAILABLE OFFLINE'}</span>
                {pwaUpdate && <button type="button" onClick={() => applyPwaUpdate(pwaUpdate)}>RELOAD UPDATE</button>}
                {!pwaUpdate && <button type="button" onClick={() => setOfflineReady(false)}>OK</button>}
              </div>
            )}

            <header className="masthead v2-masthead">
              <div className="system-row" aria-label="System status">
                <span>SOFT MACHINE 001 · EMOTIONAL POS</span>
                <span><i aria-hidden="true" /> {editingLocked ? 'PROCESSING' : 'READY'} · LOCAL-FIRST</span>
              </div>
              <div className="brand-lockup"><h1>bad day<br />receipt</h1></div>
              <div className="hero-copy">
                <p className="intro">Turn today’s invisible costs into official documentation.</p>
                <p>NO ACCOUNT · NO DIAGNOSIS · JUST RECEIPTS</p>
              </div>
              <div className="hero-transaction" aria-live="polite">
                <span>CURRENT TRANSACTION</span>
                <strong>{live.itemCount} ITEMS · {currency(live.total)}</strong>
              </div>
            </header>

            <nav className="mobile-machine-tools" aria-label="Machine drawers">
              <button type="button" disabled={editingLocked} onClick={(event) => {
                sheetTriggerRef.current = event.currentTarget
                setActiveSheet('paper')
              }}><span>PAPER</span><strong>{theme.shortName}</strong></button>
              <button type="button" onClick={(event) => {
                sheetTriggerRef.current = event.currentTarget
                setActiveSheet('history')
              }}><span>RECORDS</span><strong>{history.length + privateArchive.length}</strong></button>
              <button type="button" onClick={(event) => {
                sheetTriggerRef.current = event.currentTarget
                setActiveSheet('settings')
              }}><span>SETTINGS</span><strong>{soundEnabled ? 'SOUND ON' : 'QUIET'}</strong></button>
              <button
                type="button"
                disabled={!machineState.isComplete}
                onClick={(event) => {
                  sheetTriggerRef.current = event.currentTarget
                  setActiveSheet('export')
                }}
              ><span>EXPORT</span><strong>{machineState.isComplete ? 'READY' : 'AFTER PRINT'}</strong></button>
            </nav>

            <a className="cf-machine-entry" href="/carry-forward">
              <span>NEW · CARRY FORWARD</span>
              <strong>CARRY ONE THING FORWARD →</strong>
            </a>

            <section className="theme-section theme-section-first" aria-labelledby="paperwork-heading">
              <div className="section-heading"><span>01</span><h2 id="paperwork-heading">Choose your paperwork</h2></div>
              <ThemePicker selected={themeId} onSelect={setThemeId} disabled={editingLocked} />
            </section>
          </MobileInstrumentScene>

          <section className="workspace" aria-label="Emotional point of sale">
            <MobileInstrumentScene name="compose-catalog" activeWhen="compose" scrollOwner="compose" className="mobile-instrument__catalog">
              <ChargeBuilder
                charges={charges}
                credits={credits}
                selected={items}
                dailyId={dailyItem.id}
                disabled={editingLocked}
                onToggle={toggleItem}
                onQuantityChange={changeQuantity}
                onAddCustom={addCustomItem}
              />
            </MobileInstrumentScene>

            <MobileInstrumentScene
              name="machine"
              activeWhen={machineScenes}
              scrollOwner={{ printing: 'none', artifact: 'receipt', recovery: 'recovery' }}
              className="mobile-instrument__machine"
            >
              <aside className="receipt-stage soft-machine-stage">
                <ReceiptMachine
                  ref={machineRef}
                  items={items}
                  receiptNumber={receiptNumber}
                  theme={theme}
                  anomaly={anomaly}
                  shareCopy={shareCopy}
                  soundEnabled={soundEnabled}
                  hapticsEnabled={hapticsEnabled}
                  threeEndingsEnabled={THREE_ENDINGS_ENABLED}
                  receiptEndingState={receiptEndingState}
                  receiptEndingPersistenceStatus={receiptEndingPersistenceStatus}
                  onReceiptEndingEvent={dispatchReceiptEnding}
                  onSoundChange={setSoundEnabled}
                  onReceiptNumberChange={setReceiptNumber}
                  createExport={createExport}
                  onTransactionComplete={recordTransaction}
                  onReceiptComplete={recordCompletedReceipt}
                  onCommitKeepArchive={commitKeepArchive}
                  onCommitRelease={commitRelease}
                  onUndoRelease={undoRelease}
                  onExpireRelease={expireRelease}
                  onReturnFromRelease={returnFromRelease}
                  onExportLocalCopy={exportLocalReceiptCopy}
                  onCloseKeepCompletion={closeKeepCompletion}
                  onMakeAnother={makeAnother}
                  onClear={clearReceipt}
                  onStateChange={setMachineState}
                />
              </aside>
            </MobileInstrumentScene>
          </section>

          <MobileInstrumentScene name="compose-tail" activeWhen="compose" className="mobile-instrument__tail">
            <TransactionDrawer history={history} archiveCount={privateArchive.length} />
            <footer>
              <span>made for tired little humans</span>
              <span>all transactions remain locally sourced</span>
            </footer>
            <CommitBar
              itemCount={live.itemCount}
              totalLabel={currency(live.total)}
              actionLabel="RING IT UP"
              disabled={items.length === 0 || editingLocked}
              hidden={editingLocked}
              onCommit={commitFromMobile}
            />
          </MobileInstrumentScene>
        </main>

        <MachineBottomSheet
          open={activeSheet !== null}
          title={activeSheet ? getMachineSheetTitle(activeSheet) : 'Machine drawer'}
          description={activeSheet === 'history'
            ? 'Private archive and recent receipts stored only on this device.'
            : undefined}
          onClose={() => setActiveSheet(null)}
          isolateRef={mainRef}
          returnFocusRef={sheetTriggerRef}
        >
          {activeSheet === 'paper' && (
            <PaperStockSheet
              selected={themeId}
              disabled={editingLocked}
              onSelect={(id) => {
                setThemeId(id)
                setActiveSheet(null)
              }}
            />
          )}
          {activeSheet === 'history' && (
            <TransactionHistorySheet
              history={history}
              privateArchive={privateArchive}
              onCreateArchiveExport={createArchiveExport}
              onReprintArchived={reprintArchivedReceipt}
              onReleaseArchived={releaseArchivedReceipt}
            />
          )}
          {activeSheet === 'settings' && (
            <MachineSettingsSheet
              soundEnabled={soundEnabled}
              hapticsEnabled={hapticsEnabled}
              onSoundChange={setSoundEnabled}
              onHapticsChange={setHapticsEnabled}
            />
          )}
          {activeSheet === 'export' && (
            <>
              <ExportFormatSheet busy={sheetExportBusy} onSave={(format) => { void saveSheetExport(format) }} />
              <p className="machine-sheet-status" aria-live="polite">{sheetExportMessage}</p>
            </>
          )}
        </MachineBottomSheet>
      </SoftMachineShell>
    </MobileInstrument>
  )
}

function ThemePicker({
  selected,
  onSelect,
  disabled,
}: {
  selected: ReceiptThemeId
  onSelect: (id: ReceiptThemeId) => void
  disabled: boolean
}) {
  return (
    <div className="theme-strip" aria-label="Available paper stock">
      {themes.map((paperTheme, index) => {
        const active = selected === paperTheme.id
        return (
          <button
            type="button"
            key={paperTheme.id}
            className={`theme-tab ${active ? 'active' : ''}`}
            aria-pressed={active}
            onClick={() => onSelect(paperTheme.id)}
            disabled={disabled}
            style={{
              '--card-paper': paperTheme.palette.paper,
              '--card-ink': paperTheme.palette.ink,
              '--card-accent': paperTheme.palette.accent,
            } as CSSProperties}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <i aria-hidden="true">{paperTheme.mark}</i>
            <strong>{paperTheme.shortName}</strong>
            <small>{active ? 'LOADED' : 'PAPER STOCK'}</small>
          </button>
        )
      })}
    </div>
  )
}

function TransactionDrawer({ history, archiveCount }: { history: SavedTransaction[]; archiveCount: number }) {
  return (
    <section className="transaction-drawer" aria-labelledby="drawer-heading">
      <div className="section-heading"><span>05</span><h2 id="drawer-heading">Local records drawer</h2></div>
      <p className="drawer-empty">PRIVATE ARCHIVE · {archiveCount}/5</p>
      {history.length === 0 ? (
        <p className="drawer-empty">NO PRIOR EVIDENCE ON THIS DEVICE</p>
      ) : (
        <div className="drawer-list">
          {history.map((transaction) => (
            <article key={transaction.id}>
              <time dateTime={transaction.createdAt}>
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(transaction.createdAt)).toUpperCase()}
              </time>
              <span>{transaction.themeName}</span>
              <strong>{currency(transaction.total)}</strong>
              <small>{transaction.itemCount} ITEMS · {transaction.receiptNumber}</small>
            </article>
          ))}
        </div>
      )}
      <p className="drawer-note">LAST FIVE · STORED ONLY IN THIS BROWSER</p>
    </section>
  )
}

export default App
