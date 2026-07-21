import {
  Receipt,
  type ReceiptArtifactState,
  type ReceiptProps,
} from '../components/Receipt'
import type {
  KeepRitualPhase,
  ReceiptEndingState,
  ReleaseRitualPhase,
} from './receiptEndingTypes'

export function ReceiptArtifact({
  endingState,
  keepPhase,
  releasePhase,
  artifactId,
  ...receiptProps
}: ReceiptProps & {
  endingState?: ReceiptEndingState['kind']
  keepPhase?: KeepRitualPhase
  releasePhase?: ReleaseRitualPhase
  artifactId?: string
}) {
  const artifactState: ReceiptArtifactState = endingState ?? 'printing'

  return (
    <Receipt
      {...receiptProps}
      artifactId={artifactId}
      artifactState={artifactState}
      keepPhase={keepPhase}
      releasePhase={releasePhase}
    />
  )
}
