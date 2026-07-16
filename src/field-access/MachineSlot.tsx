import type { CSSProperties } from 'react'

interface MachineSlotProps {
  engaged?: boolean
  aligned?: boolean
  progress?: number
  phase?: 'idle' | 'aligned' | 'captured' | 'reading' | 'accepted'
}

const phaseCopy = {
  idle: ['FIELD READER', 'READY'],
  aligned: ['ALIGNMENT', 'LOCKED'],
  captured: ['CONTACT', 'CONFIRMED'],
  reading: ['READING', 'SERIAL'],
  accepted: ['OBJECT', 'ACCEPTED'],
} as const

export function MachineSlot({
  engaged = false,
  aligned = false,
  progress = 0,
  phase = engaged ? 'captured' : aligned ? 'aligned' : 'idle',
}: MachineSlotProps) {
  const normalized = Math.max(0, Math.min(1, progress))
  const copy = phaseCopy[phase]

  return (
    <div
      className={`field-machine-slot${engaged ? ' is-engaged' : ''}`}
      data-phase={phase}
      role="img"
      aria-label={phase === 'accepted'
        ? 'Field object accepted by the machine'
        : engaged
          ? 'Field object being read by the machine'
          : aligned
            ? 'Field object aligned with insertion slot'
            : 'Field object insertion slot'}
      style={{ '--field-slot-progress': normalized } as CSSProperties}
    >
      <div className="field-machine-slot__depth" aria-hidden="true" />
      <div className="field-machine-slot__lower-chassis" aria-hidden="true">
        <span>{copy[0]}</span>
        <strong>{copy[1]}</strong>
        <i />
      </div>
      <div className="field-machine-slot__mouth" aria-hidden="true">
        <i className="field-machine-slot__roller field-machine-slot__roller--left" />
        <i className="field-machine-slot__roller field-machine-slot__roller--right" />
        <span className="field-machine-slot__progress" />
        <b className="field-machine-slot__scan-beam" />
      </div>
      <div className="field-machine-slot__upper-bezel" aria-hidden="true" />
      <div className="field-machine-slot__capture-lip" aria-hidden="true" />
    </div>
  )
}
