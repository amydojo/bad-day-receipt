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

  const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.rpc('get_field_release')
  if (error) return json({ error: 'Release record unavailable' }, 502, cors)

  return json(data, 200, cors)
})

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
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    },
  })
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}
