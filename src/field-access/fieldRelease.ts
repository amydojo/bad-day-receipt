export const FIELD_RELEASE_CODE = 'FIELD-001'
export const FIELD_RELEASE_LABEL = 'FIELD–001'
export const FIELD_RELEASE_TOTAL = 10
export const FIELD_RELEASE_REGION = 'SOUTHERN CALIFORNIA'

export interface FieldReleaseCard {
  edition: string
  object_name: string
  object_type: string
  status: 'recovered' | 'signal-absent'
  recovered_at: string | null
  last_seen_at: string | null
  operation_count: number
  region: string
}

export interface FieldReleaseRecord {
  releaseCode: string
  releaseLabel: string
  machineCode: string
  machineLabel: string
  machineName: string
  region: string
  total: number
  recoveredCount: number
  generatedAt: string
  cards: FieldReleaseCard[]
}

export function fieldObjectPosition(edition: string): string {
  return String(Math.max(1, Number.parseInt(edition, 10) || 1)).padStart(2, '0')
}

export function fieldReleaseStamp(edition: string): string {
  return `${FIELD_RELEASE_LABEL} · OBJECT ${fieldObjectPosition(edition)} / ${FIELD_RELEASE_TOTAL}`
}

export function fieldReleasePath(edition?: string, token?: string, source = 'field-object'): string {
  const params = new URLSearchParams()
  if (edition) params.set('edition', edition)
  if (token) params.set('token', token)
  if (source) params.set('source', source)
  const query = params.toString()
  return `/field/001${query ? `?${query}` : ''}`
}
