import {
  useId,
  type Ref,
} from 'react'

export interface ReceiptDecisionChoice {
  id: string
  label: string
  description: string
  onSelect: () => void
}

export function ReceiptDecisionSurface({
  eyebrow,
  title,
  body,
  choices,
  back,
  headingRef,
  persistenceNote,
}: {
  eyebrow: string
  title: string
  body: string
  choices: ReceiptDecisionChoice[]
  back?: {
    label: string
    onSelect: () => void
  }
  headingRef?: Ref<HTMLHeadingElement>
  persistenceNote?: string | null
}) {
  const id = useId()
  const headingId = `${id}-heading`

  return (
    <section
      className="receipt-decision"
      aria-labelledby={headingId}
      data-receipt-decision-surface
    >
      <p className="receipt-decision__eyebrow">{eyebrow}</p>
      <h2 id={headingId} ref={headingRef} tabIndex={-1}>
        {title}
      </h2>
      <p className="receipt-decision__body">{body}</p>

      <div className="receipt-decision__choices">
        {choices.map((choice) => {
          const descriptionId = `${id}-${choice.id}-description`
          return (
            <button
              className="receipt-decision__choice"
              data-decision-choice
              type="button"
              key={choice.id}
              aria-describedby={descriptionId}
              onClick={choice.onSelect}
            >
              <span className="receipt-decision__choice-label">{choice.label}</span>
              <span
                className="receipt-decision__choice-description"
                id={descriptionId}
              >
                {choice.description}
              </span>
            </button>
          )
        })}
      </div>

      {back && (
        <button
          className="receipt-decision__back"
          type="button"
          onClick={back.onSelect}
        >
          {back.label}
        </button>
      )}

      {persistenceNote && (
        <p className="receipt-decision__persistence" role="status">
          {persistenceNote}
        </p>
      )}
    </section>
  )
}
