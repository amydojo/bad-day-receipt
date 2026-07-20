import { CARRY_FORWARD_COMPILER_LIMITS } from './taskPlanLimits.js'

export type CompilerAttemptKind = 'initial' | 'repair'

export function getRemainingServerBudget(deadlineAt: number, now = Date.now()) {
  return Math.max(0, deadlineAt - now - CARRY_FORWARD_COMPILER_LIMITS.serverOverheadMs)
}

export function getCompilerAttemptTimeout(kind: CompilerAttemptKind, deadlineAt: number, now = Date.now()) {
  const cap = kind === 'initial'
    ? CARRY_FORWARD_COMPILER_LIMITS.initialAttemptTimeoutMs
    : CARRY_FORWARD_COMPILER_LIMITS.attemptTimeoutMs
  return Math.min(cap, getRemainingServerBudget(deadlineAt, now))
}

export function canAttemptRepair(deadlineAt: number, now = Date.now()) {
  return getRemainingServerBudget(deadlineAt, now) >= CARRY_FORWARD_COMPILER_LIMITS.minimumRepairBudgetMs
}
