export const fieldObjectTypes = [
  'entrance-pass',
  'public-test',
  'awake-machine',
  'human-subject-pass',
  'specimen-access',
  'field-access',
  'recovered-artifact',
  'operating-instructions',
  'field-note',
  'specimen-room',
] as const

export type FieldObjectType = typeof fieldObjectTypes[number]
export type CanonicalMachineId = 'LD-001'
export type CanonicalMachineLabel = 'LD–001'

export interface FieldAccessConfig {
  edition: string
  objectType: FieldObjectType
  objectName: string
  objectClass: string
  machineId: CanonicalMachineId
  machineLabel: CanonicalMachineLabel
  openingCopy: string
  accent: 'paper' | 'peach'
}

export interface FieldAccessContext {
  edition: string
  token: string
  objectType: FieldObjectType
  machineId: CanonicalMachineId
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
