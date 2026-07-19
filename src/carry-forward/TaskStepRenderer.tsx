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
      const expanded = session.expandedChoices[step.id]
      const visible = fewerDecisions && !expanded
        ? step.options.filter((option) => option.primary)
        : step.options
      return (
        <fieldset className="cf-step-content cf-choice-list">
          <legend>{step.prompt}</legend>
          {visible.map((option) => (
            <label key={option.id} className="cf-choice" data-selected={session.choices[step.id] === option.id || undefined}>
              <input
                type="radio"
                name={step.id}
                value={option.id}
                checked={session.choices[step.id] === option.id}
                onChange={() => dispatch({ type: 'SELECT_CHOICE', stepId: step.id, optionId: option.id })}
              />
              <span><strong>{option.label}</strong><small>{option.detail}</small></span>
              {option.primary && <em>PRIMARY</em>}
            </label>
          ))}
          {visible.length < step.options.length && (
            <button
              type="button"
              className="cf-inline-action"
              onClick={() => dispatch({ type: 'SHOW_ALL_CHOICES', stepId: step.id })}
            >
              SHOW ALL CHOICES
            </button>
          )}
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
          <small>{value.length}/4000 · SAVED {session.composeDrafts[step.id] === undefined ? 'AFTER EDIT' : 'ON THIS DEVICE'}</small>
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
        </div>
      )
    default:
      return assertNever(step)
  }
}
