import { getFieldAccessConfig } from './fieldAccessConfig'

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
  const config = getFieldAccessConfig(edition)
  const objectName = config?.objectName ?? 'Field Object'
  const objectClass = config?.objectClass ?? `LD–${edition}`
  const openingCopy = config?.openingCopy ?? 'This object belongs to another machine.'
  const accent = config?.accent ?? 'paper'

  return (
    <article
      className={[
        'field-object-card',
        compact ? 'field-object-card--compact' : '',
        entering ? 'field-object-card--entering' : '',
      ].filter(Boolean).join(' ')}
      data-accent={accent}
      aria-label={`Lab Dojo ${objectName}, edition ${edition}, serial ${token}`}
    >
      <div className="field-object-card__left">
        <span className="field-object-card__category">{objectClass}</span>
        <strong className="field-object-card__edition">{edition}</strong>
        <span className="field-object-card__condition">CONDITION / ACTIVE</span>
      </div>
      <div className="field-object-card__body">
        <strong>{objectName.toUpperCase()}</strong>
        <p>{openingCopy}</p>
        <span className="field-object-card__serial">FIELD OBJECT / {token}</span>
      </div>
      <div className="field-object-card__qr" aria-hidden="true">
        <span />
      </div>
      <footer>
        <span>LD–{edition} / KEEP THIS CARD</span>
        <i aria-hidden="true" />
      </footer>
    </article>
  )
}
