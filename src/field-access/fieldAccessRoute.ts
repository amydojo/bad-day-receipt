import type { FieldAccessRoute } from './fieldAccessTypes'

const editionPattern = /^\d{2}$/
const tokenPattern = /^[A-Z0-9]{4,24}$/

export function parseFieldAccessRoute(pathname: string): FieldAccessRoute {
  const parts = pathname
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts[0] !== 'access') return { kind: 'root' }
  if (parts.length !== 3) return { kind: 'invalid', reason: 'shape' }

  let edition: string
  let token: string
  try {
    edition = decodeURIComponent(parts[1] ?? '')
    token = decodeURIComponent(parts[2] ?? '').toUpperCase()
  } catch {
    return { kind: 'invalid', reason: 'shape' }
  }

  if (!editionPattern.test(edition)) return { kind: 'invalid', reason: 'edition' }
  if (!tokenPattern.test(token)) return { kind: 'invalid', reason: 'token' }

  return { kind: 'access', edition, token }
}

export function makeFieldAccessPath(edition: string, token: string): string {
  return `/access/${encodeURIComponent(edition)}/${encodeURIComponent(token.toUpperCase())}`
}
