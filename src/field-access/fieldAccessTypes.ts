export type FieldObjectType = 'recovered-artifact'

export interface FieldAccessConfig {
  edition: string
  objectType: FieldObjectType
  objectName: string
  objectClass: string
  machineId: 'bad-day-receipt'
  machineLabel: 'SM–001'
  openingCopy: string
  accent: 'peach'
}

export interface FieldAccessContext {
  edition: string
  token: string
  objectType: FieldObjectType
  machineId: 'bad-day-receipt'
  firstAccessedAt: string
  lastAccessedAt: string
}

export interface FieldAccessEnvelope {
  version: 1
  current: FieldAccessContext | null
  claims: FieldAccessContext[]
}

export type FieldAccessRoute =
  | { kind: 'root' }
  | { kind: 'access'; edition: string; token: string }
  | { kind: 'invalid'; reason: 'shape' | 'edition' | 'token' }
