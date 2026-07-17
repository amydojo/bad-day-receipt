import { useEffect, useMemo, useState } from 'react'
import { trackFieldEvent } from '../analytics/fieldAnalytics'
import { getFieldAccessConfig, publicArchiveUrl } from './fieldAccessConfig'
import {
  FIELD_RELEASE_LABEL,
  FIELD_RELEASE_REGION,
  FIELD_RELEASE_TOTAL,
  type FieldReleaseRecord,
} from './fieldRelease'

const RELEASE_URL = 'https://pxdoyoxstebyagyhlwfd.supabase.co/functions/v1/field-release'

export function FieldReleaseBoard() {
  const identity = useMemo(readFieldIdentity, [])
  const [release, setRelease] = useState<FieldReleaseRecord | null>(null)
  const [status, setStatus] = useState('READING FIELD SIGNALS…')

  useEffect(() => {
    const controller = new AbortController()
    void fetch(RELEASE_URL, {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Release record unavailable')
        return response.json() as Promise<FieldReleaseRecord>
      })
      .then((payload) => {
        setRelease(payload)
        setStatus(`${payload.recoveredCount} OF ${payload.total} RECOVERED`)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatus('FIELD SIGNAL TEMPORARILY UNAVAILABLE')
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!identity.edition || !identity.token) return
    const config = getFieldAccessConfig(identity.edition)
    if (!config) return
    trackFieldEvent('field_archive_viewed', {
      edition: identity.edition,
      token: identity.token,
      objectType: config.objectType,
      machineId: 'LD-001',
      source: identity.source,
    }, { oncePerLoad: true })
  }, [identity])

  const recoveredCount = release?.recoveredCount ?? 0
  const total = release?.total ?? FIELD_RELEASE_TOTAL
  const cards = release?.cards ?? placeholderCards()
  const instagramUrl = identity.edition && identity.token
    ? `/go/instagram/${identity.edition}/${identity.token}?edition=${identity.edition}&token=${identity.token}&source=field-release-board`
    : publicArchiveUrl

  return (
    <main className="field-release-board" aria-labelledby="field-release-title">
      <header className="field-release-board__header">
        <div className="field-release-board__signal" aria-hidden="true"><i /><i /><i /></div>
        <span>LD–FIELD ARCHIVE / PUBLIC</span>
        <a href="/" aria-label="Open LD–001">LD–001</a>
      </header>

      <section className="field-release-board__hero">
        <p>PHYSICAL RELEASE / ACTIVE</p>
        <h1 id="field-release-title">FIELD–001</h1>
        <div className="field-release-board__summary">
          <strong>{String(recoveredCount).padStart(2, '0')} / {String(total).padStart(2, '0')}</strong>
          <span>OBJECTS<br />RECOVERED</span>
        </div>
        <p className="field-release-board__lead">
          Ten physical access objects were released across Southern California.
          Each recovered object can operate LD–001 and leave a permanent signal in this archive.
        </p>
        <div className="field-release-board__status" role="status">{status}</div>
      </section>

      <section className="field-release-board__ledger" aria-labelledby="field-ledger-title">
        <div className="field-release-board__section-title">
          <span>01</span>
          <h2 id="field-ledger-title">OBJECT LEDGER</h2>
        </div>
        <div className="field-release-board__grid">
          {cards.map((card) => {
            const recovered = card.status === 'recovered'
            return (
              <article
                className="field-release-object"
                data-status={card.status}
                key={card.edition}
              >
                <div className="field-release-object__number">{card.edition}</div>
                <div className="field-release-object__body">
                  <span>{recovered ? 'OBJECT RECOVERED' : 'SIGNAL ABSENT'}</span>
                  <strong>{recovered ? card.object_name.toUpperCase() : 'FIELD POSITION HELD'}</strong>
                  <small>{card.region || FIELD_RELEASE_REGION}</small>
                </div>
                <div className="field-release-object__history">
                  {recovered ? (
                    <>
                      <span>{formatRecoveryDate(card.recovered_at)}</span>
                      <span>{card.operation_count > 0 ? 'OPERATED LD–001' : 'AWAITING MACHINE OPERATION'}</span>
                    </>
                  ) : (
                    <>
                      <span>NO RECORDED SIGNAL</span>
                      <span>FIELD–001 REMAINS ACTIVE</span>
                    </>
                  )}
                </div>
                <i aria-hidden="true" />
              </article>
            )
          })}
        </div>
      </section>

      <section className="field-release-board__continuation" aria-labelledby="field-continuation-title">
        <span>02 / NEXT CHAPTER</span>
        <h2 id="field-continuation-title">THE FIELD REPORT<br />CONTINUES.</h2>
        <p>Future objects, recovered signals, and new Lab Dojo machines are documented in the public archive.</p>
        <a href={instagramUrl}>CONTINUE FIELD REPORTS AT @LABDOJO ↗</a>
      </section>

      <footer className="field-release-board__footer">
        <span>{FIELD_RELEASE_LABEL}</span>
        <span>{FIELD_RELEASE_REGION}</span>
        <span>LD–001 / BAD DAY RECEIPT</span>
      </footer>
    </main>
  )
}

function readFieldIdentity(): { edition: string | null; token: string | null; source: string } {
  const params = new URLSearchParams(window.location.search)
  const edition = params.get('edition')
  const token = params.get('token')
  return {
    edition: edition && /^\d{2}$/.test(edition) ? edition : null,
    token: token && /^[A-HJ-NP-Z2-9]{6}$/.test(token) ? token : null,
    source: params.get('source') ?? 'field-release-board',
  }
}

function formatRecoveryDate(value: string | null): string {
  if (!value) return 'RECOVERY DATE / PENDING'
  return `FIRST SIGNAL / ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value)).toUpperCase()}`
}

function placeholderCards(): FieldReleaseRecord['cards'] {
  return Array.from({ length: FIELD_RELEASE_TOTAL }, (_, index) => ({
    edition: String(index + 1).padStart(2, '0'),
    object_name: 'Field Object',
    object_type: 'unknown',
    status: 'signal-absent' as const,
    recovered_at: null,
    last_seen_at: null,
    operation_count: 0,
    region: FIELD_RELEASE_REGION,
  }))
}
