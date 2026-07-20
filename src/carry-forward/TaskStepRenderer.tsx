import { Fragment } from 'react'
import type { CarryForwardEvent, RuntimeSession } from './carryForwardReducer'
import { assertNever, type TaskStep, type ValidatedTaskPlan } from './taskPlanSchema'

export function isStepReady(step: TaskStep, session: RuntimeSession) {
  switch (step.kind) {
    case 'read':
    case 'review':
      return true
    case 'choice':
      return Boolean(session.choices[step.id])
    case 'compose':
      return (session.composeDrafts[step.id] ?? step.template).trim().length > 0
    case 'checklist':
      return step.items.every((item) => session.checkedItems[item.id])
    default:
      return assertNever(step)
  }
}

export function getStepActionLabel(step: TaskStep, isFinalStep: boolean): string {
  if (isFinalStep) return 'Close this task'
  switch (step.kind) {
    case 'read':
      return 'Continue'
    case 'choice':
      return 'Confirm choice'
    case 'compose':
      return 'Save draft'
    case 'checklist':
      return 'Continue'
    case 'review':
      return 'Finish review'
    default:
      return assertNever(step)
  }
}

export function TaskStepRenderer({
  step,
  plan,
  session,
  fewerDecisions,
  dispatch,
}: {
  step: TaskStep
  plan: ValidatedTaskPlan
  session: RuntimeSession
  fewerDecisions: boolean
  dispatch: React.Dispatch<CarryForwardEvent>
}) {
  switch (step.kind) {
    case 'read': {
      const facts = step.evidenceFactIds
        .map((factId) => plan.extractedFacts.find((fact) => fact.id === factId))
        .filter((fact) => fact !== undefined)
      return (
        <div className="cf-step-content cf-step-content--read">
          <p>{step.instruction}</p>
          <div className="cf-read-card">{step.body}</div>
          {facts.map((fact) => (
            <details className="cf-evidence" key={fact.id}>
              <summary><span>{fact.label}</span><strong>{fact.value}</strong></summary>
              <blockquote>{fact.evidenceQuote}</blockquote>
              <small>Exact source quote · characters {fact.startOffset}–{fact.endOffset}</small>
            </details>
          ))}
        </div>
      )
    }
    case 'choice': {
      const expanded = Boolean(session.expandedChoices[step.id])
      const visibleOptions = fewerDecisions && !expanded
        ? step.options.filter((option) => option.primary)
        : step.options
      const hiddenCount = step.options.length - visibleOptions.length
      return (
        <fieldset className="cf-step-content cf-choice-list">
          <legend>{step.prompt}</legend>
          <div id={`cf-choice-options-${step.id}`} className="cf-choice-options">
            {visibleOptions.map((option) => (
              <label key={option.id} className="cf-choice" data-selected={session.choices[step.id] === option.id || undefined}>
                <input
                  type="radio"
                  name={step.id}
                  value={option.id}
                  checked={session.choices[step.id] === option.id}
                  onChange={() => dispatch({ type: 'SELECT_CHOICE', stepId: step.id, optionId: option.id })}
                />
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                {option.primary && <em>RECOMMENDED</em>}
              </label>
            ))}
          </div>
          {hiddenCount > 0 && (
            <button
              type="button"
              className="cf-inline-action"
              aria-expanded={expanded}
              aria-controls={`cf-choice-options-${step.id}`}
              onClick={() => dispatch({ type: 'SHOW_ALL_CHOICES', stepId: step.id })}
            >
              SHOW ALL CHOICES · {hiddenCount} MORE
            </button>
          )}
          <span className="cf-sr-only" aria-live="polite">
            {expanded
              ? 'All approved choices are visible.'
              : hiddenCount > 0
                ? `${hiddenCount} additional approved choices are available.`
                : 'All approved choices are visible.'}
          </span>
        </fieldset>
      )
    }
    case 'compose': {
      const value = session.composeDrafts[step.id] ?? step.template
      return (
        <div className="cf-step-content cf-compose">
          <label htmlFor={`compose-${step.id}`}>{step.prompt}</label>
          <textarea
            id={`compose-${step.id}`}
            value={value}
            placeholder={step.placeholder}
            maxLength={4000}
            rows={12}
            onChange={(event) => dispatch({ type: 'UPDATE_COMPOSE', stepId: step.id, value: event.target.value })}
          />
          <small>{value.length}/4000 · {session.composeDrafts[step.id] === undefined ? 'PRESERVED AFTER YOUR FIRST EDIT' : 'PRESERVED ON THIS DEVICE'}</small>
        </div>
      )
    }
    case 'checklist':
      return (
        <fieldset className="cf-step-content cf-checklist">
          <legend>{step.instruction}</legend>
          {step.items.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={Boolean(session.checkedItems[item.id])}
                onChange={() => dispatch({ type: 'TOGGLE_CHECK', itemId: item.id })}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </fieldset>
      )
    case 'review':
      return (
        <div className="cf-step-content cf-review">
          <p>{step.summary}</p>
          <dl>
            {step.includes.map((item, index) => (
              <Fragment key={item}>
                <dt>{String(index + 1).padStart(2, '0')}</dt>
                <dd>{item}</dd>
              </Fragment>
            ))}
          </dl>
          <p className="cf-review-boundary">Prepared for your review. Nothing has been sent, submitted, filed, or approved.</p>
        </div>
      )
    default:
      return assertNever(step)
  }
}
