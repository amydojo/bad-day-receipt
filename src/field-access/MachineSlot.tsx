import {
  forwardRef,
  type CSSProperties,
  type ReactNode,
} from 'react'

export type MachineSlotPhase =
  | 'idle'
  | 'aligned'
  | 'captured'
  | 'reading'
  | 'accepted'
  | 'unlocked'

interface MachineSlotProps {
  phase?: MachineSlotPhase
  children?: ReactNode
}

const phaseCopy: Record<MachineSlotPhase, string> = {
  idle: 'FIELD READER',
  aligned: 'CARD ALIGNED',
  captured: 'CARD CAPTURED',
  reading: 'VALIDATING QR',
  accepted: 'QR VERIFIED',
  unlocked: 'SM–001 / READY',
}

const phaseDetail: Record<MachineSlotPhase, string> = {
  idle: 'TOP LOAD / READY',
  aligned: 'GUIDES / LOCKED',
  captured: 'HOLD POSITION',
  reading: 'OPTICAL MATCH',
  accepted: 'ACCESS KEY / VALID',
  unlocked: 'SOFT MACHINE',
}

export const MachineSlot = forwardRef<HTMLDivElement, MachineSlotProps>(
  function MachineSlot({ phase = 'idle', children }, ref) {
    const label = phaseCopy[phase]
    const detail = phaseDetail[phase]

    return (
      <div
        ref={ref}
        className="field-machine-slot"
        data-phase={phase}
        role="status"
        aria-live="polite"
        aria-label={`${label}. ${detail}.`}
        style={{ '--field-reader-proximity': 0 } as CSSProperties}
      >
        <div className="field-machine-slot__material" aria-hidden="true" />
        <div className="field-machine-slot__throat" aria-hidden="true">
          <span className="field-machine-slot__reflection" />
          <b className="field-machine-slot__scan-beam" />
        </div>
        <div className="field-machine-slot__lip" aria-hidden="true" />
        <span className="field-machine-slot__status" aria-hidden="true">{label}</span>
        <span className="field-machine-slot__detail" aria-hidden="true">{detail}</span>
        <i className="field-machine-slot__sensor" aria-hidden="true" />
        <div className="field-machine-slot__machine-content">
          {children}
        </div>
      </div>
    )
  },
)
