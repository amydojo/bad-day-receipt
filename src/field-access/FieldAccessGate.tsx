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
import { InstagramRedirect, MetricsDashboard } from '../analytics/AnalyticsRoutes'
import { fieldEventContext, trackFieldEvent } from '../analytics/fieldAnalytics'
import { getFieldAccessConfig } from './fieldAccessConfig'
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
  const pathname = window.location.pathname
  const route = useMemo(() => parseFieldAccessRoute(pathname), [pathname])

  if (pathname === '/go/instagram' || pathname.startsWith('/go/instagram/')) return <InstagramRedirect />
  if (pathname === '/lab/metrics') return <MetricsDashboard />
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
  const analyticsContext = useMemo(
    () => fieldEventContext(config, route.token, returning),
    [config, returning, route.token],
  )

  useFieldAccessDocumentLock(!machineOpen)

  useEffect(() => {
    trackFieldEvent('field_opened', analyticsContext, { oncePerLoad: true })
  }, [analyticsContext])

  useEffect(() => {
    const trackPresentation = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!target.closest('.field-access-button--present')) return
      trackFieldEvent('object_presented', analyticsContext, { oncePerLoad: true })
    }
    document.addEventListener('click', trackPresentation)
    return () => document.removeEventListener('click', trackPresentation)
  }, [analyticsContext])

  const acceptObject = useCallback(() => {
    setContext(claimFieldAccess(config, route.token))
    trackFieldEvent('qr_verified', analyticsContext, { oncePerLoad: true })
  }, [analyticsContext, config, route.token])

  const beginMachine = useCallback(() => {
    const accepted = context ?? claimFieldAccess(config, route.token)
    setContext(accepted)
    trackFieldEvent('machine_started', analyticsContext, { oncePerLoad: true })
    setMachineOpen(true)
  }, [analyticsContext, config, context, route.token])

  if (!machineOpen || !context) {
    return (
      <Suspense fallback={<FieldAccessLoading edition={config.edition} />}>
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
    <FieldAccessContinuation context={context} config={config}>
      {children}
    </FieldAccessContinuation>
  )
}

function FieldAccessLoading({ edition }: { edition: string }) {
  return (
    <main className="field-access-terminal" aria-label="Loading field access terminal">
      <div className="field-access-terminal__shell">
        <header className="field-access-terminal__header">
          <span>LD–FIELD TERMINAL / {edition}</span>
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
  config,
}: {
  children: ReactNode
  context: FieldAccessContext
  config: FieldAccessConfig
}) {
  const baselineReceipt = useRef(readLastCompletedReceiptNumber())
  const trackedReceipt = useRef<string | null>(null)
  const [rewardReady, setRewardReady] = useState(false)
  const [archiveDismissed, setArchiveDismissed] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = readLastCompletedReceiptNumber()
      if (!current || current === baselineReceipt.current) return
      setRewardReady(true)
      if (trackedReceipt.current === current) return
      trackedReceipt.current = current
      trackFieldEvent('receipt_generated', fieldEventContext(config, context.token), { oncePerLoad: true })
    }, 700)
    return () => window.clearInterval(interval)
  }, [config, context.token])

  const archiveUrl = `/go/instagram/${encodeURIComponent(context.edition)}/${encodeURIComponent(context.token)}?edition=${encodeURIComponent(context.edition)}&token=${encodeURIComponent(context.token)}&source=artifact-bridge`

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
          <strong id="field-archive-title">FIELD OBJECT {context.edition}<br />HAS OPERATED LD–001</strong>
          <p>Other field objects and future machines are documented inside the public archive.</p>
          <a href={archiveUrl} target="_blank" rel="noopener">
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
          <a href="/">OPEN LD–001 WITHOUT FIELD ACCESS</a>
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
