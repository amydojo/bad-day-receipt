import { afterEach, describe, expect, it, vi } from 'vitest'
import { startCarryForwardCompileRun } from './carryForwardCompileRun'
import { CARRY_FORWARD_COMPILER_LIMITS } from './taskPlanLimits'

describe('Carry Forward client compile deadline', () => {
  afterEach(() => vi.useRealTimers())

  it('allows the complete initial-plus-repair server budget', async () => {
    vi.useFakeTimers()
    const onSuccess = vi.fn()
    const onFailure = vi.fn()
    const onTimeout = vi.fn()
    const run = startCarryForwardCompileRun({
      execute: () => new Promise<string>((resolve) => setTimeout(() => resolve('validated-plan'), 50_000)),
      onSuccess,
      onFailure,
      onTimeout,
    })

    await vi.advanceTimersByTimeAsync(49_999)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await run.promise
    expect(CARRY_FORWARD_COMPILER_LIMITS.clientTimeoutMs).toBe(58_000)
    expect(onSuccess).toHaveBeenCalledWith('validated-plan')
    expect(onFailure).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('fails closed at the client deadline', async () => {
    vi.useFakeTimers()
    const onSuccess = vi.fn()
    const onFailure = vi.fn()
    const onTimeout = vi.fn()
    const run = startCarryForwardCompileRun({
      execute: (signal) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('late sensitive response')))
      }),
      onSuccess,
      onFailure,
      onTimeout,
    })

    await vi.advanceTimersByTimeAsync(58_000)
    await run.promise
    expect(run.signal.aborted).toBe(true)
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('ignores a late response after client cancellation', async () => {
    vi.useFakeTimers()
    let resolveRequest: ((value: string) => void) | undefined
    const onSuccess = vi.fn()
    const onFailure = vi.fn()
    const onTimeout = vi.fn()
    const run = startCarryForwardCompileRun({
      execute: () => new Promise<string>((resolve) => {
        resolveRequest = resolve
      }),
      onSuccess,
      onFailure,
      onTimeout,
    })

    run.cancel()
    resolveRequest?.('late-plan')
    await run.promise
    expect(run.signal.aborted).toBe(true)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onFailure).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
