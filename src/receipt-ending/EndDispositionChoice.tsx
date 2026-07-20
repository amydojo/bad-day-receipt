import type { Ref } from 'react'
import { ReceiptDecisionSurface } from './ReceiptDecisionSurface'

export function EndDispositionChoice({
  headingRef,
  onKeep,
  onRelease,
  onBack,
  persistenceNote,
}: {
  headingRef?: Ref<HTMLHeadingElement>
  onKeep: () => void
  onRelease: () => void
  onBack: () => void
  persistenceNote?: string | null
}) {
  return (
    <ReceiptDecisionSurface
      eyebrow="TWO VALID ENDINGS"
      title="How should the receipt leave your hands?"
      body="Keeping and releasing receive equal care. Neither decision asks you to continue."
      headingRef={headingRef}
      persistenceNote={persistenceNote}
      choices={[
        {
          id: 'keep',
          label: 'KEEP RECEIPT',
          description: 'Preserve it privately.',
          onSelect: onKeep,
        },
        {
          id: 'release',
          label: 'LET IT GO',
          description: 'Release it after it has been acknowledged.',
          onSelect: onRelease,
        },
      ]}
      back={{
        label: 'BACK TO ENDING CHOICE',
        onSelect: onBack,
      }}
    />
  )
}
