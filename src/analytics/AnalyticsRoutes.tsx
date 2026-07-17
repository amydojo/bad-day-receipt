import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { getFieldAccessConfig, publicArchiveUrl } from '../field-access/fieldAccessConfig'
import { trackFieldEvent } from './fieldAnalytics'
import { fetchFieldMetrics, type SupabaseFieldMetrics } from './supabaseFieldClient'

export function InstagramRedirect() {
  const identity = useMemo(readRedirectIdentity, [])
  const config = identity.edition ? getFieldAccessConfig(identity.edition) : null

  useEffect(() => {
    if (config && identity.token) {
      trackFieldEvent('instagram_clicked', {
        edition: config.edition,
        token: identity.token,
        objectType: config.objectType,
        machineId: 'LD-001',
        source: identity.source,
      }, { oncePerLoad: true })
    }

    const timeout = window.setTimeout(() => {
      window.location.replace(publicArchiveUrl)
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [config, identity])

  return (
    <main className="analytics-redirect" aria-labelledby="archive-redirect-title">
      <div className="analytics-redirect__signal" aria-hidden="true"><i /><i /><i /></div>
      <p>LD–PUBLIC ARCHIVE</p>
      <h1 id="archive-redirect-title">OPENING<br />ARCHIVE</h1>
      <span>{config && identity.token ? `FIELD OBJECT / ${config.edition} / ${identity.token}` : 'EXTERNAL HANDOFF'}</span>
      <a href={publicArchiveUrl}>CONTINUE TO @LABDOJO ↗</a>
    </main>
  )
}

export function MetricsDashboard() {
  const [accessKey, setAccessKey] = useState(() => sessionStorage.getItem('lab-metrics-key') ?? '')
  const [range, setRange] = useState('30d')
  const [metrics, setMetrics] = useState<SupabaseFieldMetrics | null>(null)
  const [status, setStatus] = useState(accessKey ? 'READY TO LOAD' : 'OPERATOR AUTHORIZATION REQUIRED')
  const [loading, setLoading] = useState(false)

  const loadMetrics = async (key = accessKey, selectedRange = range) => {
    if (!key) return
    setLoading(true)
    setStatus('READING PERSISTENT FIELD HISTORY…')
    try {
      const payload = await fetchFieldMetrics(key, selectedRange)
      sessionStorage.setItem('lab-metrics-key', key)
      setMetrics(payload)
      setStatus(`FIELD–001 / ${selectedRange.toUpperCase()} / CURRENT`)
    } catch (error) {
      setMetrics(null)
      setStatus(error instanceof Error ? error.message.toUpperCase() : 'ACCESS DENIED')
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

  const machineCode = metrics?.machine.machine_code?.replace('-', '–') ?? 'LD–001'
  const machineName = metrics?.machine.machine_name ?? 'Bad Day Receipt'
  const archiveTotal = metrics ? archiveViews(metrics.totals) : 0

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
            <Metric label="ARCHIVE VIEWS" value={archiveTotal} />
            <Metric label="INSTAGRAM" value={metrics.totals.instagram_clicked} />
          </section>

          <section className="metrics-console__funnel" aria-labelledby="funnel-title">
            <div className="metrics-console__section-title">
              <span>01</span><h2 id="funnel-title">FIELD FUNNEL</h2>
            </div>
            <FunnelStep label="OPENED" value={metrics.totals.field_opened} base={metrics.totals.field_opened} />
            <FunnelStep label="PRESENTED" value={metrics.totals.object_presented} base={metrics.totals.field_opened} />
            <FunnelStep label="QR VERIFIED" value={metrics.totals.qr_verified} base={metrics.totals.field_opened} />
            <FunnelStep label={`${machineCode} STARTED`} value={metrics.totals.machine_started} base={metrics.totals.field_opened} />
            <FunnelStep label="RECEIPT GENERATED" value={metrics.totals.receipt_generated} base={metrics.totals.field_opened} />
            <FunnelStep label="FIELD ARCHIVE VIEWED" value={archiveTotal} base={metrics.totals.field_opened} />
            <FunnelStep label="INSTAGRAM CLICKED" value={metrics.totals.instagram_clicked} base={metrics.totals.field_opened} />
          </section>

          <section className="metrics-console__cards" aria-labelledby="cards-title">
            <div className="metrics-console__section-title">
              <span>02</span><h2 id="cards-title">PHYSICAL OBJECTS</h2>
            </div>
            <div className="metrics-console__table-wrap">
              <table>
                <thead><tr><th>OBJECT</th><th>OPEN</th><th>PEOPLE</th><th>VERIFY</th><th>RECEIPT</th><th>ARCHIVE</th><th>IG</th></tr></thead>
                <tbody>
                  {metrics.cards.map((card) => (
                    <tr key={card.edition}>
                      <th>
                        <strong>LD–{card.edition}</strong>
                        <span>{card.name}</span>
                        <small>{card.placement_label ?? card.placement_code ?? 'PLACEMENT / UNASSIGNED'}</small>
                      </th>
                      <td>{card.pageviews}</td>
                      <td>{card.visitors}</td>
                      <td>{card.qr_verified}</td>
                      <td>{card.receipt_generated}</td>
                      <td>{archiveViews(card)}</td>
                      <td>{card.instagram_clicked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="metrics-console__cards" aria-labelledby="machine-title">
            <div className="metrics-console__section-title">
              <span>03</span><h2 id="machine-title">MACHINE HISTORY</h2>
            </div>
            <div className="metrics-console__totals">
              <Metric label="CANONICAL MACHINE" valueText={`${machineCode} / ${machineName.toUpperCase()}`} />
              <Metric label="OBJECTS UNLOCKED" value={metrics.machine.object_unlock_count ?? 0} />
              <Metric label="TOTAL OPERATIONS" value={metrics.machine.total_operations ?? 0} />
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

function Metric({ label, value, valueText }: { label: string; value?: number; valueText?: string }) {
  return <div><span>{label}</span><strong>{valueText ?? (value ?? 0).toLocaleString()}</strong></div>
}

function FunnelStep({ label, value, base }: { label: string; value: number; base: number }) {
  const rate = base > 0 ? Math.round((value / base) * 100) : 0
  const style = { '--funnel-rate': `${Math.min(100, rate)}%` } as CSSProperties
  return (
    <div className="metrics-console__funnel-step">
      <span>{label}</span><i style={style} />
      <strong>{value.toLocaleString()}</strong><small>{rate}%</small>
    </div>
  )
}

function archiveViews(value: object): number {
  const candidate = value as { field_archive_viewed?: unknown }
  return typeof candidate.field_archive_viewed === 'number' ? candidate.field_archive_viewed : 0
}

function readRedirectIdentity(): { edition: string | null; token: string | null; source: string } {
  const params = new URLSearchParams(window.location.search)
  const segments = window.location.pathname.split('/').filter(Boolean)
  const pathEdition = segments[2] ?? null
  const pathToken = segments[3] ?? null
  return {
    edition: normalizeEdition(params.get('edition') ?? pathEdition),
    token: normalizeToken(params.get('token') ?? pathToken),
    source: params.get('source') ?? 'artifact-bridge',
  }
}

function normalizeEdition(value: string | null): string | null {
  return value && /^\d{2}$/.test(value) ? value : null
}

function normalizeToken(value: string | null): string | null {
  return value && /^[A-HJ-NP-Z2-9]{6}$/.test(value) ? value : null
}
