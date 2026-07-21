import { useEffect } from 'react'
import { CarryForwardDesignation } from './CarryForwardDesignation'

export default function CarryForwardDesignationApp() {
  useEffect(() => {
    document.title = 'Carry Forward · Designate One Thing'
  }, [])

  return (
    <main className="cf-app carry-designation-app" data-carry-designation-route="direct">
      <header className="carry-designation-app__system-bar">
        <a href="/" aria-label="Return to Bad Day Receipt">BAD DAY RECEIPT</a>
        <span>DIRECT ENTRY · PRIVATE · TEMPORARY</span>
      </header>
      <CarryForwardDesignation
        origin={{ kind: 'direct' }}
        onNothingAfterAll={() => window.location.assign('/')}
      />
    </main>
  )
}
