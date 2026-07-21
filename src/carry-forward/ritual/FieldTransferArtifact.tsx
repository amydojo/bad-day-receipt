import type { CarryRitualHandoff } from './carryForwardRitualTypes'

export function FieldTransferArtifact({
  handoff,
  issued,
  applyAvailable,
  onApply,
  onAdjust,
  onCancel,
}: {
  handoff: CarryRitualHandoff
  issued: boolean
  applyAvailable: boolean
  onApply: () => void
  onAdjust: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="field-transfer"
      data-field-transfer
      data-field-transfer-issued={issued || undefined}
      data-source-stub-id={handoff.stubId}
    >
      <div className="field-transfer__registration" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="field-transfer__serial">FIELD TRANSFER · 027</p>
      <p className="field-transfer__capacity">LOW CAPACITY · HIGH EFFORT</p>
      <strong className="field-transfer__obligation">{handoff.obligation.text}</strong>
      <dl className="field-transfer__policy">
        <div><dt>ONE STEP</dt><dd>{handoff.budget.policies.oneStepAtATime ? 'ACTIVE' : 'VISIBLE PLAN'}</dd></div>
        <div><dt>TWO CHOICES</dt><dd>{handoff.budget.policies.fewerDecisions ? 'PROTECTED' : 'AVAILABLE'}</dd></div>
        <div><dt>PROGRESS PRESERVED</dt><dd>{handoff.budget.policies.protectProgress ? 'YES' : 'SESSION ONLY'}</dd></div>
      </dl>
      <p className="field-transfer__statement">
        This task no longer needs to ask for full capacity.
      </p>
      <p id="field-transfer-automatic-boundary" className="field-transfer__boundary">
        Nothing is sent automatically.
      </p>

      {issued && (
        <div className="field-transfer__actions">
          <button
            type="button"
            disabled={!applyAvailable}
            aria-describedby="field-transfer-automatic-boundary"
            onClick={onApply}
          >
            APPLY
          </button>
          <button type="button" onClick={onAdjust}>ADJUST</button>
          <button type="button" onClick={onCancel}>CANCEL</button>
          {!applyAvailable && (
            <p className="field-transfer__pending" role="status">
              Apply remains unavailable until the existing compiler/runtime handoff is connected.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
