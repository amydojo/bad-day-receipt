import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '@vercel/analytics'
import {
  analyticsBeforeSend,
  trackFieldEvent,
} from './fieldAnalytics'

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

describe('FIELD-001 analytics privacy contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/access/06/44ZSSL?placement=library-shelf')
  })

  it('tracks only operational field dimensions', () => {
    trackFieldEvent('field_opened', {
      edition: '06',
      token: '44ZSSL',
      objectType: 'field-access',
      machineId: 'bad-day-receipt',
    })

    expect(track).toHaveBeenCalledWith('field_opened', {
      batch: 'FIELD-001',
      edition: '06',
      token: '44ZSSL',
      object_type: 'field-access',
      machine: 'bad-day-receipt',
      returning: false,
      placement: 'library-shelf',
      source: 'field-object',
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
