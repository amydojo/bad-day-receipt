import { clampUnit } from './carryForwardRitualThresholds'
import type {
  ActuatorMilestone,
  CarryRitualEvent,
  CarryRitualPayload,
  CarryRitualRecoveryReason,
  CarryRitualState,
} from './carryForwardRitualTypes'

const MILESTONE_ORDER: Record<ActuatorMilestone, number> = {
  easy: 0,
  medium: 1,
  heavy: 2,
  detent: 3,
  locked: 4,
}

function makeStubId(receiptId: string) {
  const normalized = receiptId.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  return `carry-stub-${normalized || 'receipt'}`
}

export function createInitialCarryRitualState(payload: CarryRitualPayload): CarryRitualState {
  if (!payload.obligation.confirmedByUser) {
    throw new Error('Carry Forward ritual requires a user-confirmed obligation.')
  }
  if (payload.budget.receiptId !== payload.receiptId) {
    throw new Error('Carry Forward ritual receipt and Interaction Budget must agree.')
  }
  return {
    phase: 'extension-printing',
    payload,
    stubId: makeStubId(payload.receiptId),
    actuatorProgress: 0,
    actuatorMilestone: null,
    reachedMilestones: [],
    recoveryReason: null,
  }
}

function recoverPhase(reason: CarryRitualRecoveryReason): CarryRitualState['phase'] {
  if (reason === 'tear-canceled') return 'extension-ready'
  if (reason === 'intake-jam') return 'stub-separated'
  return 'actuator-ready'
}

export function carryForwardRitualReducer(
  state: CarryRitualState,
  event: CarryRitualEvent,
): CarryRitualState {
  switch (event.type) {
    case 'EXTENSION_PRINTED':
      return state.phase === 'extension-printing'
        ? { ...state, phase: 'extension-ready' }
        : state

    case 'START_TEAR':
      return state.phase === 'extension-ready'
        ? { ...state, phase: 'tear-tension', recoveryReason: null }
        : state

    case 'TEAR_RELEASED_EARLY':
      return state.phase === 'tear-tension'
        ? { ...state, phase: 'extension-ready' }
        : state

    case 'STUB_SEPARATED':
      return state.phase === 'tear-tension' || state.phase === 'extension-ready'
        ? { ...state, phase: 'stub-separated', recoveryReason: null }
        : state

    case 'START_ALIGNMENT':
      return state.phase === 'stub-separated'
        ? { ...state, phase: 'stub-aligning', recoveryReason: null }
        : state

    case 'STUB_ALIGNED':
      return state.phase === 'stub-aligning'
        ? { ...state, phase: 'stub-intake' }
        : state

    case 'INTAKE_COMPLETED':
      return state.phase === 'stub-intake'
        ? { ...state, phase: 'actuator-revealing' }
        : state

    case 'ACTUATOR_REVEALED':
      return state.phase === 'actuator-revealing'
        ? {
            ...state,
            phase: 'actuator-ready',
            actuatorProgress: 0,
            actuatorMilestone: null,
            reachedMilestones: [],
          }
        : state

    case 'ACTUATOR_MILESTONE': {
      if (![
        'actuator-ready',
        'actuator-easy',
        'actuator-medium',
        'actuator-heavy',
        'actuator-detent',
      ].includes(state.phase)) return state

      const progress = clampUnit(event.progress)
      const currentOrder = state.actuatorMilestone === null
        ? -1
        : MILESTONE_ORDER[state.actuatorMilestone]
      const nextOrder = MILESTONE_ORDER[event.milestone]

      if (nextOrder < currentOrder) return state
      if (event.milestone === state.actuatorMilestone && progress <= state.actuatorProgress) return state

      const phase = `actuator-${event.milestone}` as CarryRitualState['phase']
      const reachedMilestones = state.reachedMilestones.includes(event.milestone)
        ? state.reachedMilestones
        : [...state.reachedMilestones, event.milestone]

      return {
        ...state,
        phase,
        actuatorProgress: progress,
        actuatorMilestone: event.milestone,
        reachedMilestones,
        recoveryReason: null,
      }
    }

    case 'ACTUATOR_RELEASED':
      if (![
        'actuator-easy',
        'actuator-medium',
        'actuator-heavy',
        'actuator-detent',
      ].includes(state.phase)) return state
      return {
        ...state,
        phase: 'released-early',
        actuatorProgress: 0,
        actuatorMilestone: null,
      }

    case 'RESET_ACTUATOR':
      return state.phase === 'released-early'
        ? {
            ...state,
            phase: 'actuator-ready',
            actuatorProgress: 0,
            actuatorMilestone: null,
            reachedMilestones: [],
          }
        : state

    case 'LOCK_SETTLED':
      return state.phase === 'actuator-locked'
        ? { ...state, phase: 'transform-registering' }
        : state

    case 'TRANSFORM_REGISTERED':
      return state.phase === 'transform-registering'
        ? { ...state, phase: 'transfer-issuing' }
        : state

    case 'TRANSFER_ISSUED':
      return state.phase === 'transfer-issuing'
        ? { ...state, phase: 'transfer-issued' }
        : state

    case 'FAIL':
      if (state.phase === 'transfer-issued') return state
      return {
        ...state,
        phase: 'recovery',
        recoveryReason: event.reason,
      }

    case 'RECOVER':
      if (state.phase !== 'recovery' || !state.recoveryReason) return state
      return {
        ...state,
        phase: recoverPhase(state.recoveryReason),
        actuatorProgress: state.recoveryReason === 'conversion-failed' ? 0 : state.actuatorProgress,
        actuatorMilestone: state.recoveryReason === 'conversion-failed' ? null : state.actuatorMilestone,
        reachedMilestones: state.recoveryReason === 'conversion-failed' ? [] : state.reachedMilestones,
        recoveryReason: null,
      }

    default:
      return state
  }
}

export function toCarryRitualHandoff(state: CarryRitualState) {
  if (state.phase !== 'transfer-issued') return null
  return {
    obligation: state.payload.obligation,
    sourceText: state.payload.sourceText,
    budget: state.payload.budget,
    origin: state.payload.origin,
    receiptId: state.payload.receiptId,
    stubId: state.stubId,
  } as const
}
