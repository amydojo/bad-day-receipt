import {
  Receipt,
  type ReceiptArtifactState,
  type ReceiptProps,
} from '../components/Receipt'
import type { ReceiptEndingState } from './receiptEndingTypes'

export function ReceiptArtifact({
  endingState,
  ...receiptProps
}: ReceiptProps & {
  endingState?: ReceiptEndingState['kind']
}) {
  const artifactState: ReceiptArtifactState = endingState ?? 'printing'

  return (
    <Receipt
      {...receiptProps}
      artifactState={artifactState}
    />
  )
}
