const VAGUE_TARGET = /^(?:deal with|handle|fix|do|sort out|take care of|work on)\s+(?:it|that|this|the thing|things?|stuff|something|the issue|the problem)$/i
const VAGUE_WORDS = new Set([
  'care',
  'deal',
  'do',
  'fix',
  'handle',
  'issue',
  'it',
  'on',
  'problem',
  'something',
  'sort',
  'stuff',
  'take',
  'that',
  'the',
  'thing',
  'things',
  'this',
  'with',
  'work',
])

/**
 * Reject only clearly content-free tasks. Concrete noun phrases and verbs are
 * deliberately open-ended so ordinary tasks are not forced through a brittle
 * product-owned verb allowlist.
 */
export function hasConcreteTask(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length < 3 || VAGUE_TARGET.test(normalized)) return false

  const words = normalized.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu) ?? []
  if (words.length < 2) return false
  return words.some((word) => !VAGUE_WORDS.has(word))
}
