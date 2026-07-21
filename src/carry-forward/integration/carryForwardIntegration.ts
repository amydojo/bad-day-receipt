import {
  createCompiledRuntimeSession,
  type CarryForwardDraft,
  type CarryForwardState,
  type FallbackReason,
} from '../carryForwardReducer'
import { startCarryForwardCompileRun } from '../carryForwardCompileRun'
import {
  CarryForwardCompileError,
  compileCarryForwardTask,
  type ValidatedTaskPlan,
} from '../carryForwardEffects'
import {
  saveCarryForwardSession,
  type StoredCarryForwardFallback,
  type StoredCarryForwardSession,
} from '../carryForwardStorage'
import type { InteractionBudget } from '../interactionBudget'
import type { CarryRitualHandoff } from '../ritual/carryForwardRitualTypes'

export const IN_TREE_APPLY_MINIMUM_MS = 800

export type InTreeApplyingStage =
  | 'goal-identified'
  | 'required-facts-isolated'
  | 'minimum-interface-ready'

export interface InTreeActivationResult {
  plan: ValidatedTaskPlan
  startedAt: string
  repaired: boolean
  durationMs: number
}

export function createInTreeCompilingState(
  handoff: CarryRitualHandoff,
): Extract<CarryForwardState, { kind: 'compiling' }> {
  return {
    kind: 'compiling',
    draft: {
      task: handoff.obligation.text,
      source: handoff.sourceText,
      receiptId: handoff.receiptId,
    },
    budget: handoff.budget,
    phase: 'request-accepted',
    resume: null,
  }
}

export function createInTreeRestoredState(
  stored: StoredCarryForwardSession | StoredCarryForwardFallback,
): CarryForwardState {
  if (stored.status === 'fallback') {
    return {
      kind: 'fallback',
      draft: stored.draft,
      budget: stored.budget,
      reason: stored.reason,
      manualItems: stored.manualItems,
      manualDraft: stored.manualDraft,
      resume: null,
    }
  }
  if (stored.status === 'complete') {
    return {
      kind: 'complete',
      task: stored.task,
      budget: stored.budget,
      session: stored.session,
    }
  }
  return {
    kind: 'active',
    task: stored.task,
    budget: stored.budget,
    session: stored.session,
  }
}

export function startTrustedInTreeActivation({
  draft,
  budget,
  storage,
  onStage,
  onSuccess,
  onFailure,
  onTimeout,
  now = () => new Date(),
  performanceNow = () => performance.now(),
  minimumApplyingMs = IN_TREE_APPLY_MINIMUM_MS,
  execute = compileCarryForwardTask,
}: {
  draft: CarryForwardDraft
  budget: InteractionBudget
  storage: Pick<Storage, 'setItem'>
  onStage: (stage: InTreeApplyingStage) => void
  onSuccess: (result: InTreeActivationResult) => void
  onFailure: (reason: FallbackReason) => void
  onTimeout: () => void
  now?: () => Date
  performanceNow?: () => number
  minimumApplyingMs?: number
  execute?: typeof compileCarryForwardTask
}) {
  const started = performanceNow()
  let activationTimer: ReturnType<typeof setTimeout> | null = null
  let active = true
  onStage('goal-identified')

  const fail = (error: unknown) => {
    if (!active) return
    active = false
    const reason = error instanceof CarryForwardCompileError
      ? error.reason
      : 'server_error'
    onFailure(reason)
  }

  const run = startCarryForwardCompileRun({
    execute: (signal) => execute({ draft, budget, signal }),
    onSuccess: (result) => {
      if (!active) return
      onStage('required-facts-isolated')
      const startedAt = now().toISOString()
      const session = createCompiledRuntimeSession(result.plan, startedAt, null)
      const persisted = saveCarryForwardSession(storage, {
        status: 'active',
        task: draft.task,
        budget,
        session,
      })
      if (!persisted) {
        fail(new CarryForwardCompileError('server_error'))
        return
      }
      onStage('minimum-interface-ready')
      const durationMs = Math.max(0, performanceNow() - started)
      const remaining = Math.max(0, minimumApplyingMs - durationMs)
      activationTimer = setTimeout(() => {
        if (!active) return
        active = false
        onSuccess({
          plan: result.plan,
          startedAt,
          repaired: result.repaired,
          durationMs: Math.max(0, performanceNow() - started),
        })
      }, remaining)
    },
    onFailure: fail,
    onTimeout: () => {
      if (!active) return
      active = false
      onTimeout()
    },
  })

  return {
    promise: run.promise,
    signal: run.signal,
    cancel() {
      active = false
      run.cancel()
      if (activationTimer !== null) clearTimeout(activationTimer)
      activationTimer = null
    },
  }
}
