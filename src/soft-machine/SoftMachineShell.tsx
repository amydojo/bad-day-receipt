import type { SoftMachineShellProps } from './types'

export function SoftMachineShell({
  machineId,
  phase,
  focused = false,
  layoutMode = 'adaptive',
  activeTheme,
  className = '',
  children,
}: SoftMachineShellProps) {
  return (
    <div
      className={`soft-machine-shell ${className}`.trim()}
      data-machine-id={machineId}
      data-phase={phase}
      data-layout-mode={layoutMode}
      data-focused={focused}
      data-active-theme={activeTheme}
    >
      {children}
    </div>
  )
}
