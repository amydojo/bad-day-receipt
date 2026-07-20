import { z } from 'zod'
import type { ReceiptTheme } from '../themes'
import type { ReceiptItem } from '../types'

const ReceiptThemeIdSchema = z.enum([
  'original',
  'cvs',
  'government',
  'luxury',
  'victorian',
])

const ReceiptItemSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(240),
  amount: z.number().finite(),
  kind: z.enum(['charge', 'credit']),
  quantity: z.number().int().min(1).max(9),
}).strict()

export const CompletedReceiptSnapshotSchema = z.object({
  receiptNumber: z.string().min(1).max(80),
  completedAt: z.string().datetime(),
  themeId: ReceiptThemeIdSchema,
  themeName: z.string().min(1).max(120),
  items: z.array(ReceiptItemSchema).max(200),
  total: z.number().finite(),
  itemCount: z.number().int().nonnegative().max(200),
  status: z.string().min(1).max(160),
  anomaly: z.string().max(300).nullable(),
  shareCopy: z.string().max(4_000),
}).strict()

export type CompletedReceiptSnapshot = z.infer<typeof CompletedReceiptSnapshotSchema>

export interface CreateCompletedReceiptSnapshotInput {
  receiptNumber: string
  completedAt?: string
  theme: Pick<ReceiptTheme, 'id' | 'name'>
  items: ReceiptItem[]
  total: number
  itemCount: number
  status: string
  anomaly?: string | null
  shareCopy: string
}

export function createCompletedReceiptSnapshot(
  input: CreateCompletedReceiptSnapshotInput,
): CompletedReceiptSnapshot {
  const parsed = CompletedReceiptSnapshotSchema.parse({
    receiptNumber: input.receiptNumber,
    completedAt: input.completedAt ?? new Date().toISOString(),
    themeId: input.theme.id,
    themeName: input.theme.name,
    items: input.items.map((item) => ({ ...item })),
    total: input.total,
    itemCount: input.itemCount,
    status: input.status,
    anomaly: input.anomaly ?? null,
    shareCopy: input.shareCopy,
  })

  return deepFreeze(parsed)
}

export function parseCompletedReceiptSnapshot(
  value: unknown,
): CompletedReceiptSnapshot | null {
  const parsed = CompletedReceiptSnapshotSchema.safeParse(value)
  return parsed.success ? deepFreeze(parsed.data) : null
}

export function cloneCompletedReceiptSnapshot(
  snapshot: CompletedReceiptSnapshot,
): CompletedReceiptSnapshot {
  return createCompletedReceiptSnapshot({
    ...snapshot,
    theme: { id: snapshot.themeId, name: snapshot.themeName },
    items: snapshot.items,
    anomaly: snapshot.anomaly,
  })
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value

  Object.freeze(value)
  for (const child of Object.values(value)) deepFreeze(child)
  return value
}
