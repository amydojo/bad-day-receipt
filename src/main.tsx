import { Analytics } from '@vercel/analytics/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { analyticsBeforeSend } from './analytics/fieldAnalytics'
import CarryForwardApp from './carry-forward/CarryForwardApp'
import { CARRY_FORWARD_STORAGE_KEY } from './carry-forward/carryForwardStorage'
import CarryForwardDesignationApp from './carry-forward/designation/CarryForwardDesignationApp'
import { MachineErrorBoundary } from './components/MachineErrorBoundary'
import { FieldAccessGate } from './field-access/FieldAccessGate'
import './field-access/canonicalMachineLabels'
import { THREE_ENDINGS_ENABLED } from './receipt-ending'
import './styles.css'
import './cvs-realism'
import './styles/printer.css'
import './styles/v2-layout.css'
import './styles/v2-interactions.css'
import './styles/terminal.css'
import './styles/slot-depth.css'
import './styles/slot-finish.css'
import './soft-machine/softMachine.css'
import './soft-machine/machineStage.css'
import './mobile-instrument/instrument.css'
import './soft-machine/artifactActions.css'
import './soft-machine/bottomSheet.css'
import './soft-machine/pwa.css'
import './soft-machine/accessibility.css'
import './soft-machine/performance.css'
import './styles/quality-fixes.css'
import './styles/production-motion.css'
import './mobile-instrument/artifact/evidenceViewer.css'
import './styles/mobile-quality-hotfix.css'
import './field-access/field-access.css'
// The exact FIELD–001 twins intentionally override the legacy generic card shell.
import './field-access/field-object-card.css'
import './field-access/field-object-card-fidelity.css'
import './field-access/scanner-breathing-pass.css'
import './field-access/top-load-qr-reader.css'
import './field-access/top-load-reader-motion.css'
import './field-access/field-access-accessibility.css'
// Keep the viewport contract and release identity last.
import './field-access/opening-sequence-hardening.css'
import './field-access/iconic-field-release.css'
import './analytics/analytics.css'
import './analytics/iconic-metrics.css'
import './carry-forward/carry-forward.css'
import './carry-forward/carry-forward-accessibility.css'
import './receipt-ending/receipt-ending.css'
import './receipt-ending/keep/keep-receipt.css'
import './receipt-ending/release/release-receipt.css'

function hasStoredCarryForwardSession(): boolean {
  try {
    return window.localStorage.getItem(CARRY_FORWARD_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const route = normalizedPath === '/carry-forward'
  ? THREE_ENDINGS_ENABLED && !hasStoredCarryForwardSession()
    ? <CarryForwardDesignationApp />
    : <CarryForwardApp />
  : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MachineErrorBoundary>
      <FieldAccessGate>
        {route}
      </FieldAccessGate>
      <Analytics
        mode={import.meta.env.PROD ? 'production' : 'development'}
        beforeSend={analyticsBeforeSend}
      />
    </MachineErrorBoundary>
  </StrictMode>,
)
