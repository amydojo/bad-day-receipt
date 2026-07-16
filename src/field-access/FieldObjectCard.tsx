interface FieldObjectCardProps {
  edition: string
  token: string
  compact?: boolean
  entering?: boolean
}

export function FieldObjectCard({
  edition,
  token,
  compact = false,
  entering = false,
}: FieldObjectCardProps) {
  return (
    <article
      className={[
        'field-object-card',
        compact ? 'field-object-card--compact' : '',
        entering ? 'field-object-card--entering' : '',
      ].filter(Boolean).join(' ')}
      aria-label={`Lab Dojo recovered field object ${edition}, serial ${token}`}
    >
      <div className="field-object-card__left">
        <span className="field-object-card__category">LD–RECOVERED</span>
        <strong className="field-object-card__edition">{edition}</strong>
        <span className="field-object-card__condition">CONDITION / STABLE</span>
      </div>
      <div className="field-object-card__body">
        <strong>DO NOT<br />DISCARD</strong>
        <p>Part {edition} of 10.<br />The others are in<br />the archive.</p>
        <span className="field-object-card__serial">FIELD OBJECT / {token}</span>
      </div>
      <div className="field-object-card__qr" aria-hidden="true">
        <span />
      </div>
      <footer>
        <span>ARCHIVE {edition} / KEEP THIS CARD</span>
        <i aria-hidden="true" />
      </footer>
    </article>
  )
}
