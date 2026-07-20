import http from 'node:http'

const shareUrl = process.env.VERCEL_SHARE_URL
if (!shareUrl) throw new Error('VERCEL_SHARE_URL is required')
const targetOrigin = new URL(shareUrl).origin
const port = Number(process.env.SHARE_PROXY_PORT ?? 4174)

const cookies = new Map()
function cookieKey(url, name) {
  return `${new URL(url).hostname}:${name}`
}
function storeCookies(url, headers) {
  const values = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie')] : [])
  for (const value of values) {
    const pair = value?.split(';', 1)[0]
    const separator = pair?.indexOf('=') ?? -1
    if (separator <= 0) continue
    const name = pair.slice(0, separator).trim()
    const content = pair.slice(separator + 1).trim()
    cookies.set(cookieKey(url, name), { name, content })
  }
}
function cookieHeader(url) {
  const hostname = new URL(url).hostname
  return [...cookies.entries()]
    .filter(([key]) => key.startsWith(`${hostname}:`))
    .map(([, cookie]) => `${cookie.name}=${cookie.content}`)
    .join('; ')
}

async function requestWithCookies(url, options = {}) {
  const headers = new Headers(options.headers)
  const cookie = cookieHeader(url)
  if (cookie) headers.set('cookie', cookie)
  const response = await fetch(url, { ...options, headers, redirect: 'manual' })
  storeCookies(url, response.headers)
  return response
}

async function bootstrap() {
  let url = shareUrl
  for (let redirect = 0; redirect < 12; redirect += 1) {
    const response = await requestWithCookies(url)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error(`Share bootstrap redirect ${response.status} omitted Location.`)
      url = new URL(location, url).toString()
      continue
    }
    if (!response.ok) throw new Error(`Share bootstrap failed with HTTP ${response.status}.`)
    if (!url.startsWith(targetOrigin)) throw new Error('Share bootstrap did not return to the protected deployment.')
    return
  }
  throw new Error('Share bootstrap exceeded the redirect limit.')
}

await bootstrap()

const hopByHop = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'set-cookie',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const server = http.createServer(async (request, response) => {
  if (request.url === '/__health') {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('ok')
    return
  }

  try {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined
    const headers = new Headers()
    for (const [name, value] of Object.entries(request.headers)) {
      if (!value || hopByHop.has(name.toLowerCase()) || name.toLowerCase() === 'host') continue
      headers.set(name, Array.isArray(value) ? value.join(', ') : value)
    }

    const target = new URL(request.url ?? '/', targetOrigin).toString()
    const upstream = await requestWithCookies(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : body,
    })

    const outgoing = {}
    upstream.headers.forEach((value, name) => {
      if (!hopByHop.has(name.toLowerCase())) outgoing[name] = value
    })
    response.writeHead(upstream.status, outgoing)
    response.end(Buffer.from(await upstream.arrayBuffer()))
  } catch (error) {
    response.writeHead(502, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'proxy_failed' }))
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Vercel share proxy ready on http://127.0.0.1:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
