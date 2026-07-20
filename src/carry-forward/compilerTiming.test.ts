import { describe, expect, it } from 'vitest'
import { CARRY_FORWARD_COMPILER_LIMITS } from './taskPlanLimits'
import { canAttemptRepair, getCompilerAttemptTimeout, getRemainingServerBudget } from './compilerTiming'

describe('Carry Forward compiler timing', () => {
  it('keeps the browser, server, and Vercel windows in a coherent order', () => {
    expect(CARRY_FORWARD_COMPILER_LIMITS.clientTimeoutMs).toBeGreaterThan(CARRY_FORWARD_COMPILER_LIMITS.totalServerDeadlineMs)
    expect(CARRY_FORWARD_COMPILER_LIMITS.totalServerDeadlineMs).toBeLessThan(60_000)
  })

  it('gives the first attempt a longer bounded window', () => {
    const now = 1_000
    const deadline = now + CARRY_FORWARD_COMPILER_LIMITS.totalServerDeadlineMs
    expect(getCompilerAttemptTimeout('initial', deadline, now)).toBe(CARRY_FORWARD_COMPILER_LIMITS.initialAttemptTimeoutMs)
  })

  it('caps repair to the safe time remaining', () => {
    const deadline = 52_000
    const now = 45_000
    expect(getRemainingServerBudget(deadline, now)).toBe(5_500)
    expect(getCompilerAttemptTimeout('repair', deadline, now)).toBe(5_500)
    expect(canAttemptRepair(deadline, now)).toBe(true)
    expect(canAttemptRepair(deadline, 46_000)).toBe(false)
  })
})
