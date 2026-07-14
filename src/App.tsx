import {
  useEffect,
  useMemo,
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
  toggleDraftItem,
} from './draftReceipt'
import type { ArtifactExport } from './export/exportTypes'
import {
  isFocusedMachinePhase,
  isReceiptEditingLocked,
} from './machinePresentation'
import { catalog, currency, makeReceiptNumber } from './receipt'
import {
  createBrowserArtifactPlatform,
  saveArtifact,
} from './soft-machine/artifactActions'
import { CommitBar } from './soft-machine/CommitBar'
import { MachineBottomSheet } from './soft-machine/MachineBottomSheet'
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
  readHistory,
  writeHistory,
  type ExportFormat,
  type SavedTransaction,
} from './v2'

const starterIds = ['normal', 'worry', 'decisions', 'food', 'through']
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

function App() {
  const dailyItem = useMemo(() => getDailyItem(), [])
  const browserArtifactPlatform = useMemo(createBrowserArtifactPlatform, [])
  const [items, setItems] = useState<ReceiptItem[]>(createStarterItems)
  const [receiptNumber, setReceiptNumber] = useState(makeReceiptNumber)
  const [themeId, setThemeId] = useState<ReceiptThemeId>('original')
  const [history, setHistory] = useState<SavedTransaction[]>(() => readHistory())
  const [printerVisible, setPrinterVisible] = useState(false)
  const [machineState, setMachineState] = useState(initialMachineState)
  const [activeSheet, setActiveSheet] = useState<MachineSheetId | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [hapticsEnabled, setHapticsEnabled] = useState(true)
  const [sheetExportBusy, setSheetExportBusy] = useState(false)
  const [sheetExportMessage, setSheetExportMessage] = useState('')
  const mainRef = useRef<HTMLElement | null>(null)
  const printerRef = useRef<HTMLElement | null>(null)
  const machineRef = useRef<ReceiptMachineHandle | null>(null)

  const theme = getTheme(themeId)
  const charges = useMemo(
    () => [dailyItem, ...catalog.filter((item) => item.kind === 'charge')],
    [dailyItem],
  )
  const credits = useMemo(() => catalog.filter((item) => item.kind === 'credit'), [])
  const live = getDraftSummary(items)
  const anomaly = getRareAnomaly(receiptNumber)
  const shareCopy = createShareCopy(items, live.total, theme.name)
  const editingLocked = isReceiptEditingLocked(machineState.phase)
  const focusedMode = isFocusedMachinePhase(machineState.phase)

  useEffect(() => {
    const node = printerRef.current
    if (!node || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      ([entry]) => setPrinterVisible(entry.isIntersecting),
      { threshold: 0.16 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

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

  const clearReceipt = () => {
    setItems([])
    setReceiptNumber(makeReceiptNumber())
    setMachineState(initialMachineState)
  }

  const makeAnother = () => {
    setReceiptNumber(makeReceiptNumber())
    setItems(createStarterItems())
    setMachineState(initialMachineState)
    setActiveSheet(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const commitFromMobile = () => {
    if (editingLocked || items.length === 0) return
    machineRef.current?.ringItUp()
    printerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const recordTransaction = () => {
    const transaction = createSavedTransaction({
      receiptNumber,
      themeId: theme.id,
      themeName: theme.name,
      total: live.total,
      itemCount: live.itemCount,
      status: live.status,
      shareCopy,
    })
    setHistory(writeHistory(transaction))
  }

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
    <SoftMachineShell
      machineId="bad-day-receipt"
      phase={machineState.phase}
      focused={focusedMode}
      activeTheme={theme.id}
    >
      <main ref={mainRef} className="app-shell v2-shell" data-active-theme={theme.id}>
        <header className="masthead v2-masthead">
          <div className="system-row" aria-label="System status">
            <span>SOFT MACHINE 001 · EMOTIONAL POS</span>
            <span><i aria-hidden="true" /> {editingLocked ? 'PROCESSING' : 'READY'} · LOCAL ONLY</span>
          </div>
          <div className="brand-lockup">
            <h1>bad day<br />receipt</h1>
          </div>
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
          <button type="button" disabled={editingLocked} onClick={() => setActiveSheet('paper')}>
            <span>PAPER</span><strong>{theme.shortName}</strong>
          </button>
          <button type="button" onClick={() => setActiveSheet('history')}>
            <span>HISTORY</span><strong>{history.length}</strong>
          </button>
          <button type="button" onClick={() => setActiveSheet('settings')}>
            <span>SETTINGS</span><strong>{soundEnabled ? 'SOUND ON' : 'QUIET'}</strong>
          </button>
          <button
            type="button"
            disabled={!machineState.isComplete}
            onClick={() => setActiveSheet('export')}
          >
            <span>EXPORT</span><strong>{machineState.isComplete ? 'READY' : 'AFTER PRINT'}</strong>
          </button>
        </nav>

        <section className="theme-section theme-section-first" aria-labelledby="paperwork-heading">
          <div className="section-heading">
            <span>01</span>
            <h2 id="paperwork-heading">Choose your paperwork</h2>
          </div>
          <ThemePicker selected={themeId} onSelect={setThemeId} disabled={editingLocked} />
        </section>

        <section className="workspace" aria-label="Emotional point of sale">
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

          <aside className="receipt-stage soft-machine-stage" ref={printerRef}>
            <ReceiptMachine
              ref={machineRef}
              items={items}
              receiptNumber={receiptNumber}
              theme={theme}
              anomaly={anomaly}
              shareCopy={shareCopy}
              soundEnabled={soundEnabled}
              hapticsEnabled={hapticsEnabled}
              onSoundChange={setSoundEnabled}
              onReceiptNumberChange={setReceiptNumber}
              createExport={createExport}
              onTransactionComplete={recordTransaction}
              onMakeAnother={makeAnother}
              onClear={clearReceipt}
              onStateChange={setMachineState}
            />
          </aside>
        </section>

        <TransactionDrawer history={history} />

        <footer>
          <span>made for tired little humans</span>
          <span>all transactions remain locally sourced</span>
        </footer>

        <CommitBar
          itemCount={live.itemCount}
          totalLabel={currency(live.total)}
          actionLabel="RING IT UP"
          disabled={items.length === 0 || editingLocked}
          hidden={printerVisible || editingLocked}
          onCommit={commitFromMobile}
        />
      </main>

      <MachineBottomSheet
        open={activeSheet !== null}
        title={activeSheet ? getMachineSheetTitle(activeSheet) : 'Machine drawer'}
        description={activeSheet === 'history' ? 'Last five receipts stored only on this device.' : undefined}
        onClose={() => setActiveSheet(null)}
        isolateRef={mainRef}
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
        {activeSheet === 'history' && <TransactionHistorySheet history={history} />}
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
    <div className="theme-strip" role="list">
      {themes.map((theme, index) => {
        const active = selected === theme.id
        return (
          <button
            type="button"
            key={theme.id}
            className={`theme-tab ${active ? 'active' : ''}`}
            aria-pressed={active}
            onClick={() => onSelect(theme.id)}
            disabled={disabled}
            style={{
              '--card-paper': theme.palette.paper,
              '--card-ink': theme.palette.ink,
              '--card-accent': theme.palette.accent,
            } as CSSProperties}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <i aria-hidden="true">{theme.mark}</i>
            <strong>{theme.shortName}</strong>
            <small>{active ? 'LOADED' : 'PAPER STOCK'}</small>
          </button>
        )
      })}
    </div>
  )
}

function TransactionDrawer({ history }: { history: SavedTransaction[] }) {
  return (
    <section className="transaction-drawer" aria-labelledby="drawer-heading">
      <div className="section-heading">
        <span>05</span>
        <h2 id="drawer-heading">Local transaction drawer</h2>
      </div>
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
