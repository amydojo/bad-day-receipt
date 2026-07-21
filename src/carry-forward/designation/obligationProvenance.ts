import { z } from 'zod'
import type {
  ExplicitObligationInputs,
  ObligationSource,
  RemainingObligation,
} from './carryDesignationTypes'

const ExplicitObligationInputSchema = z.object({
  text: z.string().trim().min(3).max(240),
  source: z.enum([
    'explicit-current-input',
    'explicit-prior-input',
    'authored-demo-fixture',
  ]),
}).strict()

const ExplicitObligationCollectionSchema: z.ZodType<ExplicitObligationInputs> = z.object({
  explicitCurrentInputs: z.array(z.string()).max(8).optional(),
  explicitPriorInputs: z.array(z.string()).max(8).optional(),
  authoredDemoFixtures: z.array(z.string()).max(8).optional(),
}).strict()

export function createRemainingObligation({
  text,
  source,
}: {
  text: string
  source: ObligationSource
}): RemainingObligation | null {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (normalized.length < 3 || normalized.length > 240) return null
  return {
    text: normalized,
    source,
    confirmedByUser: false,
  }
}

export function createManualObligation(text: string): RemainingObligation | null {
  return createRemainingObligation({ text, source: 'manual' })
}

export function confirmObligation(
  obligation: RemainingObligation,
): RemainingObligation {
  return {
    ...obligation,
    confirmedByUser: true,
  }
}

export function parseExplicitObligation(value: unknown): RemainingObligation | null {
  const parsed = ExplicitObligationInputSchema.safeParse(value)
  if (!parsed.success) return null
  return createRemainingObligation(parsed.data)
}

export function collectExplicitObligations(value: unknown): RemainingObligation[] {
  const parsed = ExplicitObligationCollectionSchema.safeParse(value)
  if (!parsed.success) return []

  const candidates = [
    ...(parsed.data.explicitCurrentInputs ?? []).map((text) => ({
      text,
      source: 'explicit-current-input' as const,
    })),
    ...(parsed.data.explicitPriorInputs ?? []).map((text) => ({
      text,
      source: 'explicit-prior-input' as const,
    })),
    ...(parsed.data.authoredDemoFixtures ?? []).map((text) => ({
      text,
      source: 'authored-demo-fixture' as const,
    })),
  ]
    .map(createRemainingObligation)
    .filter((candidate): candidate is RemainingObligation => candidate !== null)

  return candidates.filter((candidate, index, array) => (
    array.findIndex((entry) => entry.text.toLocaleLowerCase() === candidate.text.toLocaleLowerCase()) === index
  ))
}

export function getObligationChoiceModel(candidates: RemainingObligation[]): {
  suggestion: RemainingObligation | null
  alternatives: RemainingObligation[]
} {
  if (candidates.length === 1) {
    return { suggestion: candidates[0], alternatives: [] }
  }
  return { suggestion: null, alternatives: candidates }
}
