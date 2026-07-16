const SUPABASE_METRICS_URL = 'https://pxdoyoxstebyagyhlwfd.supabase.co/functions/v1/field-metrics'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EF-ZRhlZy1r_XaWSKaazsA_eSdSFVYr'

export async function GET(request) {
  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return Response.json({ error: 'Operator authorization required' }, { status: 401 })
  }

  const requestUrl = new URL(request.url)
  const range = normalizeRange(requestUrl.searchParams.get('range'))
  const response = await fetch(`${SUPABASE_METRICS_URL}?range=${range}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: authorization,
    },
  })

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function normalizeRange(value) {
  if (value === '7d' || value === '90d') return value
  return '30d'
}
