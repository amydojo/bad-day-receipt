import {
  useEffect,
  useRef,
} from 'react'
import { TASK_PLAN_LIMITS } from '../taskPlanLimits'

export function OptionalSourceDisclosure({
  expanded,
  value,
  onExpand,
  onCollapse,
  onChange,
}: {
  expanded: boolean
  value: string
  onExpand: () => void
  onCollapse: () => void
  onChange: (value: string) => void
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const sourceRef = useRef<HTMLTextAreaElement | null>(null)
  const wasExpanded = useRef(expanded)

  useEffect(() => {
    if (!wasExpanded.current && expanded) {
      window.requestAnimationFrame(() => sourceRef.current?.focus())
    }
    if (wasExpanded.current && !expanded) {
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }
    wasExpanded.current = expanded
  }, [expanded])

  return (
    <section className="carry-designation__source" aria-labelledby="carry-source-heading">
      <button
        ref={triggerRef}
        id="carry-source-heading"
        className="carry-designation__disclosure"
        type="button"
        aria-expanded={expanded}
        aria-controls="carry-designation-source-panel"
        onClick={expanded ? onCollapse : onExpand}
      >
        <span>ADD SOURCE TEXT OR CONTEXT</span>
        <span aria-hidden="true">{expanded ? 'CLOSE' : 'OPTIONAL'}</span>
      </button>
      <p className="carry-designation__privacy">
        Source text is used only to prepare this task and is not added to receipt history.
      </p>
      {expanded && (
        <div id="carry-designation-source-panel" className="carry-designation__source-panel">
          <div className="cf-field__label-row">
            <label htmlFor="carry-designation-source">SOURCE TEXT OR CONTEXT</label>
            <span aria-hidden="true">{value.length}/{TASK_PLAN_LIMITS.source}</span>
          </div>
          <textarea
            ref={sourceRef}
            id="carry-designation-source"
            value={value}
            maxLength={TASK_PLAN_LIMITS.source}
            rows={9}
            aria-describedby="carry-designation-source-hint"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Paste only the text this task needs…"
          />
          <p id="carry-designation-source-hint" className="cf-field__hint">
            Remove account numbers or details the task does not require. Collapsing this section keeps the text until you clear or leave the designation.
          </p>
        </div>
      )}
    </section>
  )
}
