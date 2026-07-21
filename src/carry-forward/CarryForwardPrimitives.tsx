import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { InteractionPolicies } from './interactionBudget'
import type { TaskStep } from './taskPlanSchema'

export function ActionButton({
  variant = 'primary',
  busy = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet'
  busy?: boolean
}) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={`cf-button cf-button--${variant} ${props.className ?? ''}`.trim()}
      aria-busy={busy || undefined}
      disabled={busy || props.disabled}
    >
      <span>{busy ? 'WORKING…' : children}</span>
    </button>
  )
}

export function InputField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  multiline = false,
  maxLength,
  placeholder,
}: {
  id: string
  label: string
  hint: string
  error?: string | null
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  maxLength: number
  placeholder: string
}) {
  const describedBy = `${id}-hint${error ? ` ${id}-error` : ''}`
  return (
    <div className="cf-field" data-error={Boolean(error) || undefined}>
      <div className="cf-field__label-row">
        <label htmlFor={id}>{label}</label>
        <span aria-hidden="true">{value.length}/{maxLength}</span>
      </div>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          rows={12}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
        />
      )}
      <p id={`${id}-hint`} className="cf-field__hint">{hint}</p>
      {error && <p id={`${id}-error`} className="cf-field__error" role="alert">{error}</p>}
    </div>
  )
}

export const POLICY_COPY: Record<keyof InteractionPolicies, { title: string; body: string }> = {
  oneStepAtATime: {
    title: 'One step at a time',
    body: 'Show one bounded step and one clear continue action.',
  },
  fewerDecisions: {
    title: 'Fewer decisions',
    body: 'Keep secondary choices behind SHOW ALL CHOICES.',
  },
  protectProgress: {
    title: 'Protect my progress',
    body: 'Keep completed steps and drafts on this device for four hours.',
  },
  deferOptionalWork: {
    title: 'Defer optional work',
    body: 'Move whole nonrequired tasks into a separate LATER list.',
  },
}

export function InteractionPolicyCard({
  policy,
  selected,
  onToggle,
}: {
  policy: keyof InteractionPolicies
  selected: boolean
  onToggle: () => void
}) {
  const copy = POLICY_COPY[policy]
  return (
    <label className="cf-policy" data-selected={selected || undefined}>
      <input
        className="cf-policy__input"
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        aria-describedby={`cf-policy-${policy}-description`}
      />
      <span className="cf-policy__mark" aria-hidden="true">{selected ? 'ON' : 'OFF'}</span>
      <strong>{copy.title}</strong>
      <span id={`cf-policy-${policy}-description`}>{copy.body}</span>
    </label>
  )
}

export function StatusBanner({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success'
  title: string
  children: ReactNode
}) {
  return (
    <div className={`cf-status cf-status--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="cf-status__dot" aria-hidden="true" />
      <div><strong>{title}</strong><p>{children}</p></div>
    </div>
  )
}

export function TaskProgress({
  steps,
  activeIndex,
  completedStepIds,
}: {
  steps: TaskStep[]
  activeIndex: number
  completedStepIds: string[]
}) {
  return (
    <ol className="cf-progress" aria-label={`Step ${activeIndex + 1} of ${steps.length}`}>
      {steps.map((step, index) => (
        <li
          key={step.id}
          data-active={index === activeIndex || undefined}
          data-complete={completedStepIds.includes(step.id) || undefined}
        >
          <span aria-hidden="true" />
          <span className="cf-sr-only">
            {completedStepIds.includes(step.id) ? 'Completed' : index === activeIndex ? 'Current' : 'Upcoming'}: {step.title}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function TaskStepShell({
  eyebrow,
  title,
  children,
  footer,
  headingRef,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  footer: ReactNode
  headingRef?: React.Ref<HTMLHeadingElement>
}) {
  const shellRef = useRef<HTMLElement | null>(null)
  const [inTreeFooterHost, setInTreeFooterHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const shell = shellRef.current
    const runtime = shell?.closest<HTMLElement>('.cf-runtime--in-tree')
    const workspace = runtime?.querySelector<HTMLElement>('.cf-workspace')
    if (!workspace) {
      setInTreeFooterHost(null)
      return
    }

    let host = workspace.querySelector<HTMLElement>(':scope > [data-in-tree-step-dock]')
    const created = !host
    if (!host) {
      host = document.createElement('div')
      host.className = 'cf-in-tree-step-dock'
      host.setAttribute('data-in-tree-step-dock', '')
      workspace.append(host)
    }
    setInTreeFooterHost(host)

    return () => {
      setInTreeFooterHost(null)
      if (created && host?.isConnected) host.remove()
    }
  }, [])

  return (
    <article ref={shellRef} className="cf-step-shell">
      <header>
        <span className="cf-eyebrow">{eyebrow}</span>
        <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
      </header>
      <div className="cf-step-shell__body">{children}</div>
      {inTreeFooterHost ? createPortal(footer, inTreeFooterHost) : <footer>{footer}</footer>}
    </article>
  )
}

export function InspectorSheet({
  open,
  eyebrow = 'INSPECTOR · READ ONLY',
  title,
  descriptionId,
  onClose,
  children,
}: {
  open: boolean
  eyebrow?: string
  title: string
  descriptionId?: string
  onClose: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !open) return

    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && !dialog.contains(activeElement)) {
      returnFocusRef.current = activeElement
    }

    if (!dialog.open) dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()

    return () => {
      const returnTarget = returnFocusRef.current
      if (dialog.open) dialog.close()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (dialogRef.current?.open) return
          if (returnTarget?.isConnected) returnTarget.focus()
          returnFocusRef.current = null
        })
      })
    }
  }, [open])

  if (!open) return null
  return (
    <dialog
      ref={dialogRef}
      className="cf-inspector"
      aria-labelledby="cf-inspector-title"
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
    >
      <div className="cf-inspector__handle" aria-hidden="true" />
      <header>
        <span className="cf-eyebrow">{eyebrow}</span>
        <h2 id="cf-inspector-title">{title}</h2>
        <ActionButton data-autofocus variant="quiet" onClick={onClose}>CLOSE</ActionButton>
      </header>
      <div className="cf-inspector__body">{children}</div>
    </dialog>
  )
}
