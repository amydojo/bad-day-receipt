import type { RemainingObligation } from './carryDesignationTypes'

export function ObligationSuggestion({
  suggestion,
  alternatives,
  onConfirm,
  onEdit,
  onChooseOther,
}: {
  suggestion: RemainingObligation | null
  alternatives: RemainingObligation[]
  onConfirm: (obligation: RemainingObligation) => void
  onEdit: (obligation: RemainingObligation) => void
  onChooseOther: () => void
}) {
  if (suggestion) {
    return (
      <section className="carry-designation__suggestion" aria-labelledby="carry-suggestion-heading">
        <p id="carry-suggestion-heading" className="cf-eyebrow">POSSIBLE REMAINING THING</p>
        <p className="carry-designation__suggestion-text">{suggestion.text}</p>
        <div className="carry-designation__actions">
          <button type="button" className="cf-button cf-button--primary" onClick={() => onConfirm(suggestion)}>
            <span>THIS ONE</span>
          </button>
          <button type="button" className="cf-button cf-button--secondary" onClick={() => onEdit(suggestion)}>
            <span>EDIT</span>
          </button>
          <button type="button" className="cf-button cf-button--quiet" onClick={onChooseOther}>
            <span>CHOOSE SOMETHING ELSE</span>
          </button>
        </div>
      </section>
    )
  }

  return (
    <fieldset className="carry-designation__alternatives">
      <legend className="cf-eyebrow">POSSIBLE REMAINING THINGS</legend>
      <p>Choose one. Nothing is selected automatically.</p>
      {alternatives.map((obligation) => (
        <label key={`${obligation.source}:${obligation.text}`}>
          <input
            type="radio"
            name="remaining-obligation"
            value={obligation.text}
            onChange={() => onConfirm(obligation)}
          />
          <span>{obligation.text}</span>
        </label>
      ))}
      <button type="button" className="cf-button cf-button--quiet" onClick={onChooseOther}>
        <span>CHOOSE SOMETHING ELSE</span>
      </button>
    </fieldset>
  )
}
