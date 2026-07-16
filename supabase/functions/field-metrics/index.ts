import { createClient } from 'npm:@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://bad-day-receipt.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin')
  const cors = corsHeaders(origin)

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, cors)
  if (origin && !isAllowedOrigin(origin)) return json({ error: 'Origin not allowed' }, 403, cors)
  if (!hasValidPublishableKey(request.headers.get('apikey'))) return json({ error: 'Invalid client key' }, 401, cors)

  const operatorKey = bearerToken(request.headers.get('authorization'))
  if (!operatorKey) return json({ error: 'Operator authorization required' }, 401, cors)

  const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: verified, error: verifyError } = await supabase.rpc('verify_field_operator_key', { p_key: operatorKey })
  if (verifyError || verified !== true) return json({ error: 'Operator authorization failed' }, 401, cors)

  const url = new URL(request.url)
  const range = normalizeRange(url.searchParams.get('range'))
  const since = new Date(Date.now() - range.days * 86_400_000).toISOString()
  const { data, error } = await supabase.rpc('get_field_metrics', { p_since: since })

  if (error) {
    console.error('field-metrics query failed', error.code, error.message)
    return json({ error: 'Metrics query failed' }, 502, cors)
  }

  const payload = isRecord(data) ? data : {}
  return json({ ...payload, range: range.label }, 200, cors)
})

function hasValidPublishableKey(value: string | null): boolean {
  if (!value) return false
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}')
    if (Object.values(keys).includes(value)) return true
  } catch { /* legacy fallback below */ }
  return value === Deno.env.get('SUPABASE_ANON_KEY')
}

function bearerToken(value: string | null): string | null {
  if (!value?.startsWith('Bearer ')) return null
  const token = value.slice(7).trim()
  return token || null
}

function normalizeRange(value: string | null): { label: string; days: number } {
  if (value === '7d') return { label: '7d', days: 7 }
  if (value === '90d') return { label: '90d', days: 90 }
  return { label: '30d', days: 30 }
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(value: unknown, status: number, cors: HeadersInit): Response {
  return Response.json(value, {
    status,
    headers: {
      ...cors,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}
