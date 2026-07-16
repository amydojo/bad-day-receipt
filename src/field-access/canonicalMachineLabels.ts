const CANONICAL_LABEL = 'LD–001 / LAB DOJO MACHINE'

function canonicalizeMachineReveal(): void {
  document.querySelectorAll<HTMLElement>('.field-access-machine-reveal > span').forEach((label) => {
    if (label.textContent === CANONICAL_LABEL) return
    label.textContent = CANONICAL_LABEL
    label.setAttribute('aria-label', 'LD–001, Lab Dojo machine')
  })
}

if (typeof document !== 'undefined') {
  canonicalizeMachineReveal()
  const observer = new MutationObserver(canonicalizeMachineReveal)
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
