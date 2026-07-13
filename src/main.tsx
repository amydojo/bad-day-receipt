import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './cvs-realism'
import './styles/printer.css'
import './styles/v2-layout.css'
import './styles/v2-interactions.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
