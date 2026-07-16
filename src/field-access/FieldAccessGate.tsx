import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getFieldAccessConfig, publicArchiveUrl } from './fieldAccessConfig'
import { parseFieldAccessRoute } from './fieldAccessRoute'
import {
  claimFieldAccess,
  isRecognizedFieldAccess,
} from './fieldAccessStorage'
import type {
  FieldAccessConfig,
  FieldAccessContext,
  FieldAccessRoute,
} from './fieldAccessTypes'

const FieldAccessRitual = lazy(async () => {
  const module = await import('./FieldAccessRitual')
  return { default: module.FieldAccessRitual }
})

interface FieldAccessGateProps {
  children: ReactNode
}

type ResolvedAccessRoute = Extract<FieldAccessRoute, { kind: 'access' }>

export function FieldAccessGate({ children }: FieldAccessGateProps) {
  const route = useMemo(() => parseFieldAccessRoute(window.location.pathname), [])

  if (route.kind === 'root') return children
  if (route.kind === 'invalid') return <UnknownFieldObject reason={route.reason} />

  const config = getFieldAccessConfig(route.edition)
  if (!config) return <UnknownFieldObject reason="edition" />

  return (
    <ResolvedFieldAccessGate route={route} config={config}>
      {children}
    </ResolvedFieldAccessGate>
  )
}

function ResolvedFieldAccessGate({
  children,
  config,
  route,
}: {
  children: ReactNode
  config: FieldAccessConfig
  route: ResolvedAccessRoute
}) {
  const [machineOpen, setMachineOpen] = useState(false)
  const [context, setContext] = useState<FieldAccessContext | null>(null)
  const returning = isRecognizedFieldAccess(route.edition, route.token)

  useFieldAccessDocumentLock(!machineOpen)

  const acceptObject = useCallback(() => {
    setContext(claimFieldAccess(config, route.token))
  }, [config, route.token])

  const beginMachine = useCallback(() => {
    const accepted = context ?? claimFieldAccess(config, route.token)
    setContext(accepted)
    setMachineOpen(true)
  }, [config, context, route.token])

  if (!machineOpen || !context) {
    return (
      <Suspense fallback={<FieldAccessLoading />}>
        <FieldAccessRitual
          config={config}
          token={route.token}
          returning={returning}
          onAccepted={acceptObject}
          onBegin={beginMachine}
        />
      </Suspense>
    )
  }

  return (
    <FieldAccessContinuation context={context}>
      {children}
    </FieldAccessContinuation>
  )
}

function FieldAccessLoading() {
  return (
    <main className="field-access-terminal" aria-label="Loading field access terminal">
      <div className="field-access-terminal__shell">
        <header className="field-access-terminal__header">
          <span>LD–FIELD TERMINAL / 01</span>
        </header>
        <section className="field-access-screen field-access-screen--detected">
          <p className="field-access-kicker">EXTERNAL INPUT</p>
          <h1>OBJECT<br />DETECTED</h1>
          <p>Opening the field terminal.</p>
          <div className="field-access-scan" aria-hidden="true"><i /><i /><i /><i /></div>
        </section>
      </div>
    </main>
  )
}

function FieldAccessContinuation({
  children,
  context,
}: {
  children: ReactNode
  context: FieldAccessContext
}) {
  const baselineReceipt = useRef(readLastCompletedReceiptNumber())
  const [rewardReady, setRewardReady] = useState(false)
  const [archiveDismissed, setArchiveDismissed] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = readLastCompletedReceiptNumber()
      if (current && current !== baselineReceipt.current) setRewardReady(true)
    }, 700)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <div
      className="field-access-continuation"
      data-field-edition={context.edition}
      data-field-token={context.token}
    >
      {children}
      <aside className="field-access-provenance" aria-label="Current field access">
        <span>FIELD ACCESS</span>
        <strong>LD–{context.edition} / {context.token}</strong>
      </aside>

      {rewardReady && !archiveDismissed && (
        <aside className="field-access-archive-bridge" aria-labelledby="field-archive-title">
          <button
            type="button"
            className="field-access-archive-bridge__close"
            aria-label="Close public archive invitation"
            onClick={() => setArchiveDismissed(true)}
          >
            ×
          </button>
          <span>ARTIFACT GENERATED</span>
          <strong id="field-archive-title">FIELD OBJECT {context.edition}<br />HAS OPERATED SM–001</strong>
          <p>Other field objects and future machines are documented inside the public archive.</p>
          <a href={publicArchiveUrl} target="_blank" rel="noreferrer">
            OPEN THE PUBLIC ARCHIVE ↗
          </a>
        </aside>
      )}
    </div>
  )
}

function UnknownFieldObject({ reason }: { reason: string }) {
  return (
    <main className="field-access-terminal field-access-terminal--unknown">
      <div className="field-access-terminal__shell">
        <header className="field-access-terminal__header">
          <span>LD–FIELD TERMINAL / ERROR</span>
        </header>
        <section className="field-access-unknown">
          <p className="field-access-kicker">OBJECT / UNRESOLVED</p>
          <h1>UNKNOWN<br />FIELD OBJECT</h1>
          <p>The terminal could not verify this artifact.<br />Keep the object. It may belong to another machine.</p>
          <span>ERROR CLASS / {reason.toUpperCase()}</span>
          <a href="/">OPEN SM–001 WITHOUT FIELD ACCESS</a>
        </section>
      </div>
    </main>
  )
}

function useFieldAccessDocumentLock(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return

    const root = document.documentElement
    const body = document.body
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const previous = {
      rootOverflow: root.style.overflow,
      rootOverscrollBehavior: root.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
    }

    root.classList.add('field-access-scroll-locked')
    body.classList.add('field-access-scroll-locked')
    root.style.overflow = 'hidden'
    root.style.overscrollBehavior = 'none'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = `-${scrollX}px`
    body.style.right = '0'
    body.style.width = '100%'
    body.style.height = '100%'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'

    return () => {
      root.classList.remove('field-access-scroll-locked')
      body.classList.remove('field-access-scroll-locked')
      root.style.overflow = previous.rootOverflow
      root.style.overscrollBehavior = previous.rootOverscrollBehavior
      body.style.position = previous.bodyPosition
      body.style.top = previous.bodyTop
      body.style.left = previous.bodyLeft
      body.style.right = previous.bodyRight
      body.style.width = previous.bodyWidth
      body.style.height = previous.bodyHeight
      body.style.overflow = previous.bodyOverflow
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'auto' })
    }
  }, [active])
}

function readLastCompletedReceiptNumber(): string | null {
  try {
    const raw = window.localStorage.getItem('bad-day-receipt-machine-v1')
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      data?: { lastCompleted?: { receiptNumber?: unknown } | null }
    }
    return typeof parsed.data?.lastCompleted?.receiptNumber === 'string'
      ? parsed.data.lastCompleted.receiptNumber
      : null
  } catch {
    return null
  }
}
