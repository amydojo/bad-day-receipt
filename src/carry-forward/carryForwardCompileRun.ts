import { CARRY_FORWARD_COMPILER_LIMITS } from './taskPlanLimits'

type CompileRunOptions<Result> = {
  execute(signal: AbortSignal): Promise<Result>
  onSuccess(result: Result): void
  onFailure(error: unknown): void
  onTimeout(): void
  timeoutMs?: number
}

export function startCarryForwardCompileRun<Result>({
  execute,
  onSuccess,
  onFailure,
  onTimeout,
  timeoutMs = CARRY_FORWARD_COMPILER_LIMITS.clientTimeoutMs,
}: CompileRunOptions<Result>) {
  const controller = new AbortController()
  let active = true
  const timeout = setTimeout(() => {
    if (!active) return
    active = false
    controller.abort()
    onTimeout()
  }, timeoutMs)

  const promise = execute(controller.signal)
    .then((result) => {
      if (!active || controller.signal.aborted) return
      active = false
      onSuccess(result)
    })
    .catch((error: unknown) => {
      if (!active) return
      active = false
      onFailure(error)
    })
    .finally(() => clearTimeout(timeout))

  return {
    promise,
    signal: controller.signal,
    cancel() {
      active = false
      clearTimeout(timeout)
      controller.abort()
    },
  }
}
