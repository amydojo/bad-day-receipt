import type { InteractionPolicies } from '../interactionBudget'
import {
  ActionButton,
  InspectorSheet,
  InteractionPolicyCard,
} from '../CarryForwardPrimitives'

export function OneThingPreset({
  policies,
  customizing,
  onIssue,
  onOpenCustomize,
  onTogglePolicy,
  onCloseCustomize,
}: {
  policies: InteractionPolicies
  customizing: boolean
  onIssue: () => void
  onOpenCustomize: () => void
  onTogglePolicy: (policy: keyof InteractionPolicies) => void
  onCloseCustomize: () => void
}) {
  return (
    <>
      <section className="carry-designation__preset" aria-labelledby="one-thing-preset-heading">
        <p className="cf-eyebrow">RECOMMENDED ADJUSTMENT</p>
        <h2 id="one-thing-preset-heading">ONE THING MODE</h2>
        <ul>
          <li data-enabled={policies.oneStepAtATime || undefined}>One active step</li>
          <li data-enabled={policies.fewerDecisions || undefined}>Fewer visible choices</li>
          <li data-enabled={policies.protectProgress || undefined}>Progress preserved</li>
          <li>Nothing sent automatically</li>
        </ul>
        <p>
          These are your requests, not conclusions about you. The adjustment remains unchanged until you approve it.
        </p>
        <div className="carry-designation__actions">
          <ActionButton onClick={onIssue}>ISSUE ADJUSTMENT</ActionButton>
          <ActionButton variant="secondary" onClick={onOpenCustomize}>CUSTOMIZE</ActionButton>
        </div>
      </section>

      <InspectorSheet
        open={customizing}
        eyebrow="ONE THING MODE · CUSTOMIZE"
        title="Adjust what the task should ask less of"
        descriptionId="carry-customize-description"
        onClose={onCloseCustomize}
      >
        <div className="carry-designation__customize">
          <p id="carry-customize-description">
            Each control updates the same typed Interaction Budget. Nothing is compiled or sent from this sheet.
          </p>
          <div className="cf-policy-grid">
            {(Object.keys(policies) as Array<keyof InteractionPolicies>).map((policy) => (
              <InteractionPolicyCard
                key={policy}
                policy={policy}
                selected={policies[policy]}
                onToggle={() => onTogglePolicy(policy)}
              />
            ))}
          </div>
          <ActionButton data-autofocus onClick={onCloseCustomize}>APPLY CUSTOMIZATION</ActionButton>
        </div>
      </InspectorSheet>
    </>
  )
}
