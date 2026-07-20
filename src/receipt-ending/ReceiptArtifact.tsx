import {
  Receipt,
  type ReceiptArtifactState,
  type ReceiptProps,
} from '../components/Receipt'
import type {
  KeepRitualPhase,
  ReceiptEndingState,
} from './receiptEndingTypes'

export function ReceiptArtifact({
  endingState,
  keepPhase,
  artifactId,
  ...receiptProps
}: ReceiptProps & {
  endingState?: ReceiptEndingState['kind']
  keepPhase?: KeepRitualPhase
  artifactId?: string
}) {
  const artifactState: ReceiptArtifactState = endingState ?? 'printing'

  return (
    <Receipt
      {...receiptProps}
      artifactId={artifactId}
      artifactState={artifactState}
      keepPhase={keepPhase}
    />
  )
}
