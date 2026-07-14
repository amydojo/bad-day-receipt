import type { SoftMachineShellProps } from './types'

export function getSoftMachineShellAttributes({
  machineId,
  phase,
  focused = false,
  layoutMode = 'adaptive',
  activeTheme,
}: Omit<SoftMachineShellProps, 'children' | 'className'>) {
  return {
    'data-machine-id': machineId,
    'data-phase': phase,
    'data-layout-mode': layoutMode,
    'data-focused': focused,
    'data-active-theme': activeTheme,
  } as const
}

export function SoftMachineShell({
  machineId,
  phase,
  focused = false,
  layoutMode = 'adaptive',
  activeTheme,
  className = '',
  children,
}: SoftMachineShellProps) {
  const attributes = getSoftMachineShellAttributes({
    machineId,
    phase,
    focused,
    layoutMode,
    activeTheme,
  })

  return (
    <div className={`soft-machine-shell ${className}`.trim()} {...attributes}>
      {children}
    </div>
  )
}
