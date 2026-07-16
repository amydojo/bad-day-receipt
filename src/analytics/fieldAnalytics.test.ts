import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '@vercel/analytics'
import { sendFieldTelemetry } from './supabaseFieldClient'
import {
  analyticsBeforeSend,
  trackFieldEvent,
} from './fieldAnalytics'

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))
vi.mock('./supabaseFieldClient', () => ({ sendFieldTelemetry: vi.fn() }))

describe('FIELD-001 analytics privacy contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', {
      location: { search: '?placement=library-shelf' },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tracks operational dimensions under canonical LD-001 identity', () => {
    trackFieldEvent('field_opened', {
      edition: '06',
      token: '44ZSSL',
      objectType: 'field-access',
      machineId: 'retired-value',
    })

    expect(track).toHaveBeenCalledWith('field_opened', {
      batch: 'FIELD-001',
      edition: '06',
      object_type: 'field-access',
      machine: 'LD-001',
      returning: false,
      placement: 'library-shelf',
      source: 'field-object',
    })

    expect(sendFieldTelemetry).toHaveBeenCalledWith('field_opened', {
      edition: '06',
      token: '44ZSSL',
      objectType: 'field-access',
      machineId: 'LD-001',
      placement: 'library-shelf',
      source: null,
    })
  })

  it('removes query metadata from page analytics', () => {
    const event = analyticsBeforeSend({
      type: 'pageview',
      url: 'https://bad-day-receipt.vercel.app/access/06/44ZSSL?placement=library-shelf',
    })

    expect(event?.url).toBe('https://bad-day-receipt.vercel.app/access/06/44ZSSL')
  })

  it('excludes the private metrics console from page analytics', () => {
    expect(analyticsBeforeSend({
      type: 'pageview',
      url: 'https://bad-day-receipt.vercel.app/lab/metrics',
    })).toBeNull()
  })
})
