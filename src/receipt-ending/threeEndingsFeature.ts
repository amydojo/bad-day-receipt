export function resolveThreeEndingsEnabled(value: unknown): boolean {
  return value === 'true'
}

export const THREE_ENDINGS_ENABLED = resolveThreeEndingsEnabled(
  import.meta.env.VITE_THREE_ENDINGS,
)
