interface RingItUpButtonProps {
  label: string
  disabled: boolean
  onClick: () => void
}

export function RingItUpButton({
  label,
  disabled,
  onClick,
}: RingItUpButtonProps) {
  return (
    <button
      className="primary-button ring-button"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="ring-button__light" aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}
