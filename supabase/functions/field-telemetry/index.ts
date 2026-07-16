import { createClient } from 'npm:@supabase/supabase-js@2'

const allowedEvents = new Set([
  'field_opened',
  'object_presented',
  'qr_verified',
  'machine_started',
  'receipt_generated',
  'instagram_clicked',
])

const allowedOrigins = new Set([
  'https://bad-day-receipt.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin')
  const cors = corsHeaders(origin)

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)
  if (origin && !isAllowedOrigin(origin)) return json({ error: 'Origin not allowed' }, 403, cors)
  if (!hasValidPublishableKey(request.headers.get('apikey'))) return json({ error: 'Invalid client key' }, 401, cors)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, cors)
  }

  const token = cleanString(body.token, 12)?.toUpperCase()
  const eventName = cleanString(body.eventName, 40)?.toLowerCase()
  const sessionKey = cleanString(body.sessionKey, 120)
  const visitorKey = cleanString(body.visitorKey, 120)
  const placementCode = cleanString(body.placementCode, 80)
  const source = cleanString(body.source, 80) ?? 'field-object'
  const clientEventId = cleanString(body.clientEventId, 40)
  const metadata = isRecord(body.metadata) ? body.metadata : {}

  if (!token || !/^[A-HJ-NP-Z2-9]{6}$/.test(token)) return json({ error: 'Invalid field token' }, 400, cors)
  if (!eventName || !allowedEvents.has(eventName)) return json({ error: 'Unsupported event' }, 400, cors)
  if (!clientEventId || !isUuid(clientEventId)) return json({ error: 'Invalid event id' }, 400, cors)

  const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.rpc('record_field_event', {
    p_token: token,
    p_event_name: eventName,
    p_session_key: sessionKey,
    p_visitor_key: visitorKey,
    p_machine_code: 'LD-001',
    p_placement_code: placementCode,
    p_source: source,
    p_client_event_id: clientEventId,
    p_metadata: {
      returning: typeof metadata.returning === 'boolean' ? metadata.returning : undefined,
      client_version: cleanString(metadata.client_version, 40),
      viewport_class: cleanString(metadata.viewport_class, 32),
    },
  })

  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '55000' ? 410 : 400
    return json({ error: error.code === 'P0002' ? 'Unknown field object' : 'Event rejected' }, status, cors)
  }

  const result = Array.isArray(data) ? data[0] : data
  return json({ accepted: true, object: result ? {
    edition: result.edition,
    objectName: result.object_name,
    machineCode: result.machine_code,
    firstSeenAt: result.first_seen_at,
    lastSeenAt: result.last_seen_at,
    counts: {
      opens: result.open_count,
      verified: result.verified_count,
      operations: result.operation_count,
      receipts: result.receipt_count,
      instagram: result.instagram_click_count,
    },
  } : null }, 200, cors)
})

function hasValidPublishableKey(value: string | null): boolean {
  if (!value) return false
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}')
    if (Object.values(keys).includes(value)) return true
  } catch { /* legacy fallback below */ }
  return value === Deno.env.get('SUPABASE_ANON_KEY')
}

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true
  try {
    const url = new URL(origin)
    return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app')
  } catch { return false }
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && isAllowedOrigin(origin) ? origin : 'https://bad-day-receipt.vercel.app'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(value: unknown, status: number, cors: HeadersInit): Response {
  return Response.json(value, { status, headers: { ...cors, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim().slice(0, max)
  return cleaned || null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}
