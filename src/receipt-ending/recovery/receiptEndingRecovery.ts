import { track } from '@vercel/analytics'

export type RecoveryDomain = 'shared' | 'keep' | 'release' | 'carry' | 'runtime'
export type RecoveryBoundary =
  | 'documented'
  | 'archive-commit'
  | 'release-commit'
  | 'release-undo'
  | 'release-expiry'
  | 'extension-ready'
  | 'stub-separated'
  | 'actuator-ready'
  | 'transfer-issued'
  | 'compiler'
  | 'session-expiry'

export type RecoveryOutcome = 'presented' | 'retry' | 'return' | 'dismissed' | 'resolved'

export interface ReceiptEndingRecoveryEvent {
  domain: RecoveryDomain
  boundary: RecoveryBoundary
  outcome: RecoveryOutcome
}

interface RecoveryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type RecoveryEventSender = (
  name: 'three_endings_recovery',
  properties: ReceiptEndingRecoveryEvent,
) => void

const RECOVERY_EVENT_KEY = 'bad-day-receipt:recovery-events:v1'

function defaultSender(
  name: 'three_endings_recovery',
  properties: ReceiptEndingRecoveryEvent,
) {
  try {
    track(name, {
      domain: properties.domain,
      boundary: properties.boundary,
      outcome: properties.outcome,
    })
  } catch {
    // Recovery telemetry is supplemental and must never affect product state.
  }
}

function readEmitted(storage: RecoveryStorage): Set<string> {
  try {
    const raw = storage.getItem(RECOVERY_EVENT_KEY)
    if (!raw) return new Set()
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return new Set()
    return new Set(value.filter((entry): entry is string => typeof entry === 'string'))
  } catch {
    return new Set()
  }
}

export function emitReceiptEndingRecoveryEvent({
  event,
  storage,
  sender = defaultSender,
}: {
  event: ReceiptEndingRecoveryEvent
  storage?: RecoveryStorage
  sender?: RecoveryEventSender
}): boolean {
  if (typeof window === 'undefined' && !storage) return false
  const target = storage ?? window.sessionStorage
  const key = `${event.domain}:${event.boundary}:${event.outcome}`
  const emitted = readEmitted(target)
  if (emitted.has(key)) return false

  sender('three_endings_recovery', event)
  emitted.add(key)
  try {
    target.setItem(RECOVERY_EVENT_KEY, JSON.stringify([...emitted].sort()))
  } catch {
    // A denied telemetry write never blocks the recovery action.
  }
  return true
}

export function clearReceiptEndingRecoveryTelemetry(storage: Pick<Storage, 'removeItem'>) {
  try {
    storage.removeItem(RECOVERY_EVENT_KEY)
    return true
  } catch {
    return false
  }
}
