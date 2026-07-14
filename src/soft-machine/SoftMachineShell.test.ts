import { describe, expect, it } from 'vitest'
import { getSoftMachineShellAttributes } from './SoftMachineShell'
import { SOFT_MACHINE_BREAKPOINTS, SOFT_MACHINE_VIEWPORTS } from './viewport'

describe('Soft Machine shell contract', () => {
  it('exposes stable machine attributes without mutating domain state', () => {
    expect(getSoftMachineShellAttributes({
      machineId: 'bad-day-receipt',
      phase: 'feeding',
      focused: true,
      layoutMode: 'instrument',
      activeTheme: 'cvs',
    })).toEqual({
      'data-machine-id': 'bad-day-receipt',
      'data-phase': 'feeding',
      'data-layout-mode': 'instrument',
      'data-focused': true,
      'data-active-theme': 'cvs',
    })
  })

  it('uses adaptive and unfocused defaults', () => {
    expect(getSoftMachineShellAttributes({
      machineId: 'bad-day-receipt',
      phase: 'idle',
    })).toMatchObject({
      'data-layout-mode': 'adaptive',
      'data-focused': false,
    })
  })

  it('documents non-overlapping responsive breakpoints', () => {
    expect(SOFT_MACHINE_BREAKPOINTS.mobileMax + 1).toBe(SOFT_MACHINE_BREAKPOINTS.tabletMin)
    expect(SOFT_MACHINE_BREAKPOINTS.tabletMax + 1).toBe(SOFT_MACHINE_BREAKPOINTS.desktopMin)
  })

  it('covers the required release viewports', () => {
    expect(SOFT_MACHINE_VIEWPORTS.map(({ width }) => width)).toEqual([
      320, 375, 390, 393, 430, 768, 1440,
    ])
  })
})
