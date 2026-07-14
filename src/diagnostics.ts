export type DiagnosticCode =
  | 'APP_RENDER_FAILED'
  | 'EXPORT_RENDER_FAILED'
  | 'LOCAL_STATE_UNAVAILABLE'
  | 'LOCAL_STATE_INVALID'
  | 'PRINTER_PHASE_UNEXPECTED'
  | 'SERVICE_WORKER_UPDATE_FAILED'

export interface DiagnosticEvent {
  code: DiagnosticCode
  area: 'app' | 'export' | 'storage' | 'printer' | 'pwa'
  recoverable: boolean
  timestamp: string
}

export function createDiagnosticEvent(
  code: DiagnosticCode,
  area: DiagnosticEvent['area'],
  recoverable = true,
  date = new Date(),
): DiagnosticEvent {
  return {
    code,
    area,
    recoverable,
    timestamp: date.toISOString(),
  }
}

export function logDevelopmentDiagnostic(event: DiagnosticEvent): void {
  if (!import.meta.env.DEV) return
  console.error('[bad-day-receipt]', event)
}
