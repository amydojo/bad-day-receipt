export type LineItemKind = 'charge' | 'credit'

export interface CatalogItem {
  id: string
  label: string
  amount: number
  kind: LineItemKind
}

export interface ReceiptItem extends CatalogItem {
  quantity: number
}

export interface ReceiptSummary {
  charges: number
  credits: number
  emotionalTax: number
  total: number
  status: string
}
