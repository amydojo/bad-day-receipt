import type { FieldEventContext, FieldEventName } from './fieldAnalytics'

const SUPABASE_URL = 'https://pxdoyoxstebyagyhlwfd.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EF-ZRhlZy1r_XaWSKaazsA_eSdSFVYr'
const TELEMETRY_URL = `${SUPABASE_URL}/functions/v1/field-telemetry`
const METRICS_URL = `${SUPABASE_URL}/functions/v1/field-metrics`
const VISITOR_STORAGE_KEY = 'ld-field-visitor-v1'
const SESSION_STORAGE_KEY = 'ld-field-session-v1'

export interface SupabaseFieldMetrics {
  range: string
  generatedAt: string
  since: string
  machine: {
    machine_code?: string
    machine_name?: string
    object_unlock_count?: number
    total_operations?: number
    first_unlocked_at?: string | null
    last_operated_at?: string | null
  }
  totals: {
    pageviews: number
    visitors: number
    field_opened: number
    object_presented: number
    qr_verified: number
    machine_started: number
    receipt_generated: number
    instagram_clicked: number
  }
  cards: Array<{
    edition: string
    name: string
    object_type: string
    pageviews: number
    visitors: number
    field_opened: number
    object_presented: number
    qr_verified: number
    machine_started: number
    receipt_generated: number
    instagram_clicked: number
    first_seen_at: string | null
    last_seen_at: string | null
    placement_code: string | null
    placement_label: string | null
  }>
}

export function sendFieldTelemetry(
  eventName: FieldEventName,
  context: FieldEventContext,
): void {
  if (typeof window === 'undefined') return

  const payload = {
    token: context.token,
    eventName,
    sessionKey: persistentId(sessionStorage, SESSION_STORAGE_KEY),
    visitorKey: persistentId(localStorage, VISITOR_STORAGE_KEY),
    placementCode: context.placement ?? readPlacement(),
    source: context.source ?? 'field-object',
    clientEventId: randomUuid(),
    metadata: {
      returning: context.returning ?? false,
      client_version: 'field-access-v1',
      viewport_class: viewportClass(),
    },
  }

  void fetch(TELEMETRY_URL, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true,
    cache: 'no-store',
    credentials: 'omit',
  }).catch(() => {
    // Telemetry is deliberately non-blocking. The ritual remains local-first.
  })
}

export async function fetchFieldMetrics(
  operatorKey: string,
  range: string,
): Promise<SupabaseFieldMetrics> {
  const response = await fetch(`${METRICS_URL}?range=${encodeURIComponent(range)}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${operatorKey}`,
    },
    cache: 'no-store',
    credentials: 'omit',
  })

  const payload = await response.json() as SupabaseFieldMetrics & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? 'Metrics request failed')
  }
  return payload
}

function persistentId(storage: Storage, key: string): string {
  try {
    const current = storage.getItem(key)
    if (current) return current
    const created = randomUuid()
    storage.setItem(key, created)
    return created
  } catch {
    return randomUuid()
  }
}

function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function viewportClass(): string {
  const width = window.visualViewport?.width ?? window.innerWidth
  if (width <= 430) return 'mobile'
  if (width <= 900) return 'tablet'
  return 'desktop'
}

function readPlacement(): string | null {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('placement') ?? params.get('p')
  if (!value) return null
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80)
  return cleaned || null
}
