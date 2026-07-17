const CANONICAL_MACHINE_LABEL = 'LD–001 / LAB DOJO MACHINE'
const RELEASE_TOTAL = '10'

function canonicalizeFieldNarrative(): void {
  document.querySelectorAll<HTMLElement>('.field-access-terminal').forEach((terminal) => {
    const header = terminal.querySelector<HTMLElement>('.field-access-terminal__header > span')
    const edition = header?.textContent?.match(/\/\s*(\d{2})/)?.[1]
    if (!edition) return

    const returning = terminal.dataset.returning === 'true'
    const phase = terminal.dataset.state

    const machineLabel = terminal.querySelector<HTMLElement>('.field-access-machine-reveal > span')
    if (machineLabel && machineLabel.textContent !== CANONICAL_MACHINE_LABEL) {
      machineLabel.textContent = CANONICAL_MACHINE_LABEL
      machineLabel.setAttribute('aria-label', 'LD–001, Lab Dojo machine')
    }

    if (phase !== 'recognized') return

    const kicker = terminal.querySelector<HTMLElement>('[data-copy="recognized"]')
    const kickerCopy = `FIELD OBJECT ${edition} / ${returning ? 'RECOGNIZED' : 'RECOVERED'}`
    if (kicker && kicker.textContent !== kickerCopy) kicker.textContent = kickerCopy

    const lead = terminal.querySelector<HTMLElement>('.field-access-one-shot__lead')
    const leadCopy = returning
      ? 'Previously recovered. This object’s field history remains active.'
      : 'One of ten physical access objects released across Southern California.'
    if (lead && lead.textContent !== leadCopy) lead.textContent = leadCopy

    const metadata = terminal.querySelectorAll<HTMLElement>('.field-access-one-shot__metadata > span')
    const metadataCopy = ['FIELD–001', `OBJECT ${edition} / ${RELEASE_TOTAL}`, metadata[2]?.textContent ?? '']
    metadata.forEach((node, index) => {
      const next = metadataCopy[index]
      if (next && node.textContent !== next) node.textContent = next
    })

    const live = terminal.querySelector<HTMLElement>('.field-access-live')
    const liveCopy = returning
      ? `FIELD object ${edition} recognized. Its release history remains active.`
      : `FIELD object ${edition} recovered. One of ten objects released across Southern California.`
    if (live && live.textContent !== liveCopy) live.textContent = liveCopy
  })
}

if (typeof document !== 'undefined') {
  canonicalizeFieldNarrative()
  const observer = new MutationObserver(canonicalizeFieldNarrative)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-state', 'data-returning'],
  })
}
