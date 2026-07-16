import { track } from '@vercel/analytics'
import type { BeforeSendEvent } from '@vercel/analytics/react'
import type { FieldAccessConfig } from '../field-access/fieldAccessTypes'
import { sendFieldTelemetry } from './supabaseFieldClient'

export const FIELD_ANALYTICS_BATCH = 'FIELD-001'
export const CANONICAL_MACHINE_CODE = 'LD-001'

export const fieldEventNames = [
  'field_opened',
  'object_presented',
  'qr_verified',
  'machine_started',
  'receipt_generated',
  'instagram_clicked',
] as const

export type FieldEventName = (typeof fieldEventNames)[number]

export interface FieldEventContext {
  edition: string
  token: string
  objectType?: string
  machineId?: string
  returning?: boolean
  placement?: string | null
  source?: string | null
}

const emittedThisLoad = new Set<string>()

export function trackFieldEvent(
  eventName: FieldEventName,
  context: FieldEventContext,
  options: { oncePerLoad?: boolean } = {},
): void {
  if (typeof window === 'undefined') return

  const onceKey = `${eventName}:${context.edition}:${context.token}`
  if (options.oncePerLoad && emittedThisLoad.has(onceKey)) return
  if (options.oncePerLoad) emittedThisLoad.add(onceKey)

  const placement = sanitizeDimension(context.placement ?? readPlacement())
  const source = sanitizeDimension(context.source)
  const canonicalContext: FieldEventContext = {
    ...context,
    machineId: CANONICAL_MACHINE_CODE,
    placement,
    source,
  }

  try {
    track(eventName, {
      batch: FIELD_ANALYTICS_BATCH,
      edition: context.edition,
      object_type: context.objectType ?? 'unknown',
      machine: CANONICAL_MACHINE_CODE,
      returning: context.returning ?? false,
      placement: placement ?? 'unassigned',
      source: source ?? 'field-object',
    })
  } catch {
    // Vercel analytics is supplemental and must never interrupt the ritual.
  }

  sendFieldTelemetry(eventName, canonicalContext)
}

export function fieldEventContext(
  config: FieldAccessConfig,
  token: string,
  returning?: boolean,
): FieldEventContext {
  return {
    edition: config.edition,
    token,
    objectType: config.objectType,
    machineId: CANONICAL_MACHINE_CODE,
    returning,
  }
}

export function analyticsBeforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url)

  // The operator dashboard is intentionally excluded from public traffic totals.
  if (url.pathname.startsWith('/lab/metrics')) return null

  // Query parameters are operational metadata, not page identity.
  url.search = ''
  url.hash = ''

  return {
    ...event,
    url: url.toString(),
  }
}

export function readPlacement(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('placement') ?? params.get('p')
}

function sanitizeDimension(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80)
  return normalized || null
}
