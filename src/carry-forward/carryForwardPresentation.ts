import type { InteractionPolicies } from './interactionBudget'
import type { RuntimeSession } from './carryForwardReducer'
import type { ValidatedTaskPlan } from './taskPlanSchema'

export type AdaptationItem = { id: string; text: string }
export type WhyItem = { id: string; change: string; reason: string }

export function getAdaptationItems(policies: InteractionPolicies): AdaptationItem[] {
  const items: AdaptationItem[] = []
  if (policies.oneStepAtATime) items.push({ id: 'one-step', text: 'Show one active step' })
  else items.push({ id: 'full-plan', text: 'Keep the complete required plan visible' })
  if (policies.fewerDecisions) items.push({ id: 'fewer-decisions', text: 'Show the recommended choice first' })
  else items.push({ id: 'all-choices', text: 'Show all approved choices' })
  if (policies.protectProgress) items.push({ id: 'protect-progress', text: 'Preserve your selections and draft for four hours' })
  else items.push({ id: 'memory-only', text: 'Keep progress only in this open tab' })
  if (policies.deferOptionalWork) items.push({ id: 'defer', text: 'Move optional work to Later' })
  else items.push({ id: 'optional-visible', text: 'Keep optional work available with the plan' })
  items.push({ id: 'stable', text: 'Change once, then remain stable' })
  return items
}

export function getWhyItems(
  policies: InteractionPolicies,
  plan: ValidatedTaskPlan,
  session: RuntimeSession,
): WhyItem[] {
  const items: WhyItem[] = []
  if (policies.oneStepAtATime) {
    items.push({ id: 'one-step', change: 'One step is visible', reason: 'You requested one step at a time.' })
  } else {
    items.push({ id: 'plan-visible', change: 'The required plan stays visible', reason: 'You did not request one step at a time.' })
  }
  const current = plan.steps[session.stepIndex]
  if (policies.fewerDecisions && current?.kind === 'choice' && current.options.length > 1) {
    items.push({ id: 'choice', change: 'The recommended choice appears first', reason: 'You requested fewer decisions. Every approved alternative remains behind Show All Choices.' })
  } else if (!policies.fewerDecisions && current?.kind === 'choice') {
    items.push({ id: 'choices', change: 'All approved choices are visible', reason: 'You did not request fewer decisions.' })
  }
  if (policies.protectProgress) {
    items.push({ id: 'progress', change: 'Your progress is protected', reason: 'You requested progress protection for this temporary task.' })
  }
  if (policies.deferOptionalWork && plan.later.length > 0) {
    items.push({ id: 'later', change: 'Optional work is separated into Later', reason: 'You requested optional work to be deferred.' })
  }
  items.push({ id: 'stable', change: 'The layout remains stable', reason: 'Carry Forward adapts once and then stops rearranging itself.' })
  return items
}

export function getCompletionProof(plan: ValidatedTaskPlan, session: RuntimeSession) {
  const composeCount = plan.steps.filter((step) => step.kind === 'compose').length
  return {
    taskTitle: plan.title,
    requiredCompleted: session.completedStepIds.length,
    requiredTotal: plan.steps.length,
    draftsPrepared: composeCount,
    laterCount: plan.later.length,
  }
}
