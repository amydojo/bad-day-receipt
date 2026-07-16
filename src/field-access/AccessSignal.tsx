interface AccessSignalProps {
  active: 0 | 1 | 2 | 3
  label?: string
}

const stages = ['INPUT', 'PROCESS', 'ARTIFACT'] as const

export function AccessSignal({ active, label = 'Field access signal' }: AccessSignalProps) {
  return (
    <div
      className="field-access-signal"
      role="img"
      aria-label={`${label}: ${active} of 3 stages active`}
    >
      <span className="field-access-signal__spine" aria-hidden="true" />
      <div className="field-access-signal__dots" aria-hidden="true">
        {stages.map((stage, index) => (
          <i
            key={stage}
            className={index < active ? 'is-active' : ''}
            data-stage={stage.toLowerCase()}
          />
        ))}
      </div>
    </div>
  )
}
