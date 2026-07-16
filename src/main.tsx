import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MachineErrorBoundary } from './components/MachineErrorBoundary'
import { FieldAccessGate } from './field-access/FieldAccessGate'
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
import './field-access/opening-sequence-hardening.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MachineErrorBoundary>
      <FieldAccessGate>
        <App />
      </FieldAccessGate>
    </MachineErrorBoundary>
  </StrictMode>,
)
