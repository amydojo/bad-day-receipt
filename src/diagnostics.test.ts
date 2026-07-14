import { describe, expect, it } from 'vitest'
import { createDiagnosticEvent } from './diagnostics'

describe('privacy safe diagnostics', () => {
  it('records stable codes without receipt content fields', () => {
    const event = createDiagnosticEvent(
      'EXPORT_RENDER_FAILED',
      'export',
      true,
      new Date('2026-07-13T12:00:00.000Z'),
    )

    expect(event).toEqual({
      code: 'EXPORT_RENDER_FAILED',
      area: 'export',
      recoverable: true,
      timestamp: '2026-07-13T12:00:00.000Z',
    })
    expect(event).not.toHaveProperty('items')
    expect(event).not.toHaveProperty('shareText')
    expect(event).not.toHaveProperty('history')
  })
})
