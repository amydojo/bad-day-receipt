interface MachineSlotProps {
  engaged?: boolean
  progress?: number
}

export function MachineSlot({ engaged = false, progress = 0 }: MachineSlotProps) {
  const normalized = Math.max(0, Math.min(1, progress))
  return (
    <div
      className={engaged ? 'field-machine-slot is-engaged' : 'field-machine-slot'}
      role="img"
      aria-label={engaged ? 'Field object entering machine' : 'Field object insertion slot'}
    >
      <div className="field-machine-slot__face">
        <span>FIELD OBJECT / INSERT</span>
        <i aria-hidden="true" />
      </div>
      <div className="field-machine-slot__mouth" aria-hidden="true">
        <span style={{ transform: `scaleX(${normalized})` }} />
      </div>
      <div className="field-machine-slot__depth" aria-hidden="true" />
    </div>
  )
}
