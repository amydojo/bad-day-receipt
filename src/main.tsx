import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MachineErrorBoundary } from './components/MachineErrorBoundary'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MachineErrorBoundary>
      <App />
    </MachineErrorBoundary>
  </StrictMode>,
)
