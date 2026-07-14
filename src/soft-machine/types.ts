import type { ReactNode } from 'react'

export type SoftMachineLayoutMode = 'adaptive' | 'instrument' | 'workbench'

export interface SoftMachineShellProps {
  machineId: string
  phase: string
  focused?: boolean
  layoutMode?: SoftMachineLayoutMode
  activeTheme?: string
  className?: string
  children: ReactNode
}

export interface MachineStageProps {
  children: ReactNode
  className?: string
  labelledBy?: string
}

export interface CommitBarProps {
  itemCount: number
  totalLabel: string
  actionLabel: string
  disabled?: boolean
  hidden?: boolean
  onCommit: () => void
}
