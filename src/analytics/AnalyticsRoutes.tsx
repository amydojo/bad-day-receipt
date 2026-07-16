import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getFieldAccessConfig, publicArchiveUrl } from '../field-access/fieldAccessConfig'
import { trackFieldEvent } from './fieldAnalytics'

interface FunnelTotals {
  pageviews: number
  visitors: number
  field_opened: number
  object_presented: number
  qr_verified: number
  machine_started: number
  receipt_generated: number
  instagram_clicked: number
}

interface CardMetric {
  edition: string
  token: string
  name: string
  pageviews: number
  visitors: number
  field_opened: number
  qr_verified: number
  machine_started: number
  receipt_generated: number
  instagram_clicked: number
}

interface MetricsPayload {
  range: string
  generatedAt: string
  totals: FunnelTotals
  cards: CardMetric[]
}

export function InstagramRedirect() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const edition = normalizeEdition(params.get('edition'))
  const token = normalizeToken(params.get('token'))
  const source = params.get('source') ?? 'artifact-bridge'
  const config = edition ? getFieldAccessConfig(edition) : null

  useEffect(() => {
    if (config && token) {
      trackFieldEvent('instagram_clicked', {
        edition: config.edition,
        token,
        objectType: config.objectType,
        machineId: config.machineId,
        source,
      }, { oncePerLoad: true })
    }

    const timeout = window.setTimeout(() => {
      window.location.replace(publicArchiveUrl)
    }, 520)
    return () => window.clearTimeout(timeout)
  }, [config, source, token])

  return (
    <main className="analytics-redirect" aria-labelledby="archive-redirect-title">
      <div className="analytics-redirect__signal" aria-hidden="true"><i /><i /><i /></div>
      <p>LD–PUBLIC ARCHIVE</p>
      <h1 id="archive-redirect-title">OPENING<br />ARCHIVE</h1>
      <span>{config && token ? `FIELD OBJECT / ${config.edition} / ${token}` : 'EXTERNAL HANDOFF'}</span>
      <a href={publicArchiveUrl}>CONTINUE TO @LABDOJO ↗</a>
    </main>
  )
}

export function MetricsDashboard() {
  const [accessKey, setAccessKey] = useState(() => sessionStorage.getItem('lab-metrics-key') ?? '')
  const [range, setRange] = useState('30d')
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null)
  const [status, setStatus] = useState(accessKey ? 'READY TO LOAD' : 'OPERATOR AUTHORIZATION REQUIRED')
  const [loading, setLoading] = useState(false)

  const loadMetrics = async (key = accessKey, selectedRange = range) => {
    if (!key) return
    setLoading(true)
    setStatus('READING ANONYMOUS FIELD SIGNALS…')
    try {
      const response = await fetch(`/api/field-metrics?range=${encodeURIComponent(selectedRange)}`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      })
      const payload = await response.json() as MetricsPayload & { error?: string; code?: string }
      if (!response.ok) {
        setMetrics(null)
        setStatus(payload.code === 'not_configured'
          ? 'SERVER METRICS CREDENTIALS NOT CONFIGURED'
          : payload.error ?? 'ACCESS DENIED')
        return
      }
      sessionStorage.setItem('lab-metrics-key', key)
      setMetrics(payload)
      setStatus(`FIELD–001 / ${selectedRange.toUpperCase()} / CURRENT`)
    } catch {
      setMetrics(null)
      setStatus('METRICS CHANNEL UNAVAILABLE')
    } finally {
      setLoading(false)
    }
  }

  const authorize = (event: FormEvent) => {
    event.preventDefault()
    void loadMetrics()
  }

  const changeRange = (nextRange: string) => {
    setRange(nextRange)
    if (accessKey) void loadMetrics(accessKey, nextRange)
  }

  return (
    <main className="metrics-console" aria-labelledby="metrics-title">
      <header className="metrics-console__header">
        <div>
          <span>LD–FIELD OPERATIONS / PRIVATE</span>
          <h1 id="metrics-title">FIELD–001<br />SIGNAL REPORT</h1>
        </div>
        <div className="metrics-console__status" role="status">{status}</div>
      </header>

      {!metrics && (
        <form className="metrics-console__auth" onSubmit={authorize}>
          <label htmlFor="metrics-key">OPERATOR KEY</label>
          <input
            id="metrics-key"
            type="password"
            autoComplete="current-password"
            value={accessKey}
            onChange={(event) => setAccessKey(event.target.value)}
          />
          <button type="submit" disabled={!accessKey || loading}>
            {loading ? 'READING SIGNALS…' : 'OPEN PRIVATE REPORT'}
          </button>
          <p>Anonymous interaction counts only. No receipt contents or personal identities are collected.</p>
        </form>
      )}

      {metrics && (
        <>
          <nav className="metrics-console__ranges" aria-label="Report range">
            {['7d', '30d', '90d'].map((value) => (
              <button key={value} type="button" aria-pressed={range === value} onClick={() => changeRange(value)}>
                {value.toUpperCase()}
              </button>
            ))}
          </nav>

          <section className="metrics-console__totals" aria-label="Funnel totals">
            <Metric label="TOTAL OPENS" value={metrics.totals.pageviews} />
            <Metric label="UNIQUE VISITORS" value={metrics.totals.visitors} />
            <Metric label="QR VERIFIED" value={metrics.totals.qr_verified} />
            <Metric label="RECEIPTS" value={metrics.totals.receipt_generated} />
            <Metric label="INSTAGRAM" value={metrics.totals.instagram_clicked} />
          </section>

          <section className="metrics-console__funnel" aria-labelledby="funnel-title">
            <div className="metrics-console__section-title">
              <span>01</span><h2 id="funnel-title">FIELD FUNNEL</h2>
            </div>
            <FunnelStep label="OPENED" value={metrics.totals.field_opened || metrics.totals.pageviews} base={metrics.totals.field_opened || metrics.totals.pageviews} />
            <FunnelStep label="PRESENTED" value={metrics.totals.object_presented} base={metrics.totals.field_opened || metrics.totals.pageviews} />
            <FunnelStep label="QR VERIFIED" value={metrics.totals.qr_verified} base={metrics.totals.field_opened || metrics.totals.pageviews} />
            <FunnelStep label="MACHINE STARTED" value={metrics.totals.machine_started} base={metrics.totals.field_opened || metrics.totals.pageviews} />
            <FunnelStep label="RECEIPT GENERATED" value={metrics.totals.receipt_generated} base={metrics.totals.field_opened || metrics.totals.pageviews} />
            <FunnelStep label="INSTAGRAM CLICKED" value={metrics.totals.instagram_clicked} base={metrics.totals.field_opened || metrics.totals.pageviews} />
          </section>

          <section className="metrics-console__cards" aria-labelledby="cards-title">
            <div className="metrics-console__section-title">
              <span>02</span><h2 id="cards-title">PHYSICAL OBJECTS</h2>
            </div>
            <div className="metrics-console__table-wrap">
              <table>
                <thead><tr><th>OBJECT</th><th>OPEN</th><th>PEOPLE</th><th>VERIFY</th><th>RECEIPT</th><th>IG</th></tr></thead>
                <tbody>
                  {metrics.cards.map((card) => (
                    <tr key={card.token}>
                      <th><strong>LD–{card.edition}</strong><span>{card.name}</span><small>{card.token}</small></th>
                      <td>{card.pageviews || card.field_opened}</td>
                      <td>{card.visitors}</td>
                      <td>{card.qr_verified}</td>
                      <td>{card.receipt_generated}</td>
                      <td>{card.instagram_clicked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="metrics-console__footer">
            <span>GENERATED {new Date(metrics.generatedAt).toLocaleString()}</span>
            <button type="button" onClick={() => void loadMetrics()} disabled={loading}>REFRESH SIGNALS</button>
          </footer>
        </>
      )}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{value.toLocaleString()}</strong></div>
}

function FunnelStep({ label, value, base }: { label: string; value: number; base: number }) {
  const rate = base > 0 ? Math.round((value / base) * 100) : 0
  return (
    <div className="metrics-console__funnel-step">
      <span>{label}</span><i style={{ '--funnel-rate': `${Math.min(100, rate)}%` } as React.CSSProperties} />
      <strong>{value.toLocaleString()}</strong><small>{rate}%</small>
    </div>
  )
}

function normalizeEdition(value: string | null): string | null {
  return value && /^\d{2}$/.test(value) ? value : null
}

function normalizeToken(value: string | null): string | null {
  return value && /^[A-HJ-NP-Z2-9]{6}$/.test(value) ? value : null
}
