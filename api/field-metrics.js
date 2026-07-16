const PROJECT_ID = process.env.VERCEL_ANALYTICS_PROJECT_ID ?? 'prj_a8QlJCtuQxOlQnd4ABpSSujIC9BZ'
const TEAM_ID = process.env.VERCEL_ANALYTICS_TEAM_ID ?? 'team_catxQiUNiwAbO2g4LEh5BODI'
const ANALYTICS_API = 'https://api.vercel.com/v1/query/web-analytics'

const fieldObjects = [
  { edition: '01', token: 'CTNZL8', name: 'Entrance Pass' },
  { edition: '02', token: 'W9JK4J', name: 'Public Test' },
  { edition: '03', token: 'NRDND8', name: 'Awake Machine' },
  { edition: '04', token: '7PGQZM', name: 'Human Subject' },
  { edition: '05', token: 'JEJCFM', name: 'Specimen Access' },
  { edition: '06', token: '44ZSSL', name: 'Field Access' },
  { edition: '07', token: 'J49AQW', name: 'Recovered Artifact' },
  { edition: '08', token: 'JWB639', name: 'Operating Instructions' },
  { edition: '09', token: 'STS68S', name: 'Field Note' },
  { edition: '10', token: 'DJ39LF', name: 'Specimen Room' },
]

const eventNames = [
  'field_opened',
  'object_presented',
  'qr_verified',
  'machine_started',
  'receipt_generated',
  'instagram_clicked',
]

export async function GET(request) {
  const operatorKey = process.env.LAB_METRICS_KEY
  const vercelToken = process.env.VERCEL_ANALYTICS_TOKEN ?? process.env.VERCEL_TOKEN
  if (!operatorKey || !vercelToken) {
    return json({
      code: 'not_configured',
      error: 'LAB_METRICS_KEY and VERCEL_ANALYTICS_TOKEN are required.',
    }, 503)
  }

  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${operatorKey}`) {
    return json({ error: 'Operator authorization failed.' }, 401)
  }

  const url = new URL(request.url)
  const range = normalizeRange(url.searchParams.get('range'))
  const until = new Date()
  const since = new Date(until.getTime() - range.days * 24 * 60 * 60 * 1000)

  try {
    const [visitRows, visitTotals, eventRows] = await Promise.all([
      queryVisits(vercelToken, since, until),
      queryVisitTotals(vercelToken, since, until),
      queryEvents(vercelToken, since, until).catch(() => []),
    ])

    const cards = fieldObjects.map((object) => ({
      ...object,
      pageviews: 0,
      visitors: 0,
      field_opened: 0,
      object_presented: 0,
      qr_verified: 0,
      machine_started: 0,
      receipt_generated: 0,
      instagram_clicked: 0,
    }))
    const byToken = new Map(cards.map((card) => [card.token, card]))

    for (const row of visitRows) {
      const path = stringValue(row.requestPath ?? row.path ?? row.route)
      const accessObject = fieldObjects.find((candidate) => path === accessPath(candidate))
      if (accessObject) {
        const card = byToken.get(accessObject.token)
        if (card) {
          card.pageviews += numberValue(row.pageviews)
          card.visitors += numberValue(row.visitors)
        }
        continue
      }

      const instagramObject = fieldObjects.find((candidate) => path === instagramPath(candidate))
      if (instagramObject) {
        const card = byToken.get(instagramObject.token)
        if (card) card.instagram_clicked = Math.max(card.instagram_clicked, numberValue(row.pageviews))
      }
    }

    for (const row of eventRows) {
      const token = dimension(row, 'token')
      const eventName = stringValue(row.eventName ?? row.event_name)
      const card = token ? byToken.get(token) : null
      if (!card || !eventNames.includes(eventName)) continue
      const count = eventCount(row)
      if (eventName === 'instagram_clicked') {
        card.instagram_clicked = Math.max(card.instagram_clicked, count)
      } else {
        card[eventName] += count
      }
    }

    const totals = cards.reduce((sum, card) => {
      for (const eventName of eventNames) sum[eventName] += card[eventName]
      return sum
    }, {
      pageviews: visitTotals.pageviews,
      visitors: visitTotals.visitors,
      field_opened: 0,
      object_presented: 0,
      qr_verified: 0,
      machine_started: 0,
      receipt_generated: 0,
      instagram_clicked: 0,
    })

    return json({
      range: range.label,
      generatedAt: new Date().toISOString(),
      totals,
      cards,
    })
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Analytics query failed.',
    }, 502)
  }
}

async function queryVisits(token, since, until) {
  const url = analyticsUrl('/visits/aggregate', since, until)
  url.searchParams.append('by', 'requestPath')
  url.searchParams.set('limit', '100')
  url.searchParams.set('filter', trackedPathFilter())
  return queryRows(url, token)
}

async function queryVisitTotals(token, since, until) {
  const url = analyticsUrl('/visits/count', since, until)
  url.searchParams.set('filter', accessPathFilter())
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  const payload = await response.json()
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : payload.error?.message
    throw new Error(message ?? `Vercel Analytics returned ${response.status}.`)
  }
  return {
    pageviews: numberValue(payload.data?.pageviews),
    visitors: numberValue(payload.data?.visitors),
  }
}

async function queryEvents(token, since, until) {
  const url = analyticsUrl('/events/aggregate', since, until)
  url.searchParams.append('by', 'eventName')
  url.searchParams.append('by', 'eventData/edition')
  url.searchParams.append('by', 'eventData/token')
  url.searchParams.set('limit', '1000')
  url.searchParams.set('filter', "eventData/batch eq 'FIELD-001'")
  return queryRows(url, token)
}

function accessPathFilter() {
  return pathFilter(fieldObjects.map(accessPath))
}

function trackedPathFilter() {
  return pathFilter([
    ...fieldObjects.map(accessPath),
    ...fieldObjects.map(instagramPath),
  ])
}

function pathFilter(paths) {
  return `requestPath in (${paths.map((path) => `'${path}'`).join(',')})`
}

function accessPath(object) {
  return `/access/${object.edition}/${object.token}`
}

function instagramPath(object) {
  return `/go/instagram/${object.edition}/${object.token}`
}

function analyticsUrl(path, since, until) {
  const url = new URL(`${ANALYTICS_API}${path}`)
  url.searchParams.set('projectId', PROJECT_ID)
  url.searchParams.set('teamId', TEAM_ID)
  url.searchParams.set('since', since.toISOString())
  url.searchParams.set('until', until.toISOString())
  return url
}

async function queryRows(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  const payload = await response.json()
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : payload.error?.message
    throw new Error(message ?? `Vercel Analytics returned ${response.status}.`)
  }
  return Array.isArray(payload.data) ? payload.data.filter(isRecord) : []
}

function dimension(row, key) {
  const direct = row[`eventData/${key}`] ?? row[`eventData.${key}`] ?? row[key]
  if (typeof direct === 'string') return direct
  const eventData = row.eventData
  if (isRecord(eventData) && typeof eventData[key] === 'string') return eventData[key]
  const attributes = row.attributes
  if (typeof attributes === 'string') {
    try {
      const parsed = JSON.parse(attributes)
      if (isRecord(parsed)) {
        const parsedEventData = parsed.eventData
        if (isRecord(parsedEventData) && typeof parsedEventData[key] === 'string') {
          return parsedEventData[key]
        }
        if (typeof parsed[key] === 'string') return parsed[key]
      }
    } catch {
      return null
    }
  }
  return null
}

function eventCount(row) {
  return numberValue(
    row.count
    ?? row.events
    ?? row.eventCount
    ?? row.total
    ?? row.value
    ?? row.pageviews,
  )
}

function numberValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function stringValue(value) {
  return typeof value === 'string' ? value : ''
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRange(value) {
  if (value === '7d') return { label: '7d', days: 7 }
  if (value === '90d') return { label: '90d', days: 90 }
  return { label: '30d', days: 30 }
}

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
