import type { MachineStageProps } from './types'

export function MachineStage({ children, className = '', labelledBy }: MachineStageProps) {
  return (
    <section
      className={`soft-machine-stage ${className}`.trim()}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  )
}
