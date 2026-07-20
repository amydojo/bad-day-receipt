import { dirname, resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import handler from '../../api/compile-task'
import { INSURANCE_DENIAL_SOURCE, INSURANCE_DENIAL_TASK } from '../../src/carry-forward/fixtures'
import { createInteractionBudget, DEFAULT_INTERACTION_POLICIES } from '../../src/carry-forward/interactionBudget'
import { parseValidatedTaskPlan } from '../../src/carry-forward/taskPlanSchema'

const runLive = process.env.RUN_OPENAI_LIVE === '1'

if (runLive && !process.env.OPENAI_API_KEY?.trim()) {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env.local')
  try {
    delete process.env.OPENAI_API_KEY
    loadEnvFile(envPath)
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
  }
}

const liveIt = runLive ? it : it.skip

function safeCompilerErrorCode(body: unknown) {
  if (!body || typeof body !== 'object' || !('error' in body)) return 'unknown_error'
  const error = body.error
  if (!error || typeof error !== 'object' || !('code' in error) || typeof error.code !== 'string') return 'unknown_error'
  return /^[a-z0-9_]{1,80}$/.test(error.code) ? error.code : 'unknown_error'
}

function liveFailureGuidance(status: number, body: unknown) {
  const code = safeCompilerErrorCode(body)
  const guidance: Record<string, string> = {
    compiler_unavailable: 'OPENAI_API_KEY was unavailable after loading .env.local.',
    compiler_not_authorized: 'The key reached OpenAI but was rejected or lacks project/model access.',
    openai_quota_exhausted: 'The OpenAI project has exhausted credits or reached its usage limit.',
    openai_rate_limited: 'The request reached an OpenAI request/token rate limit; retry with pacing.',
    compiler_contract_rejected: 'OpenAI rejected the request contract; inspect the model and schema configuration.',
    compiler_timeout: 'The server-side OpenAI request exceeded the bounded timeout.',
    compiler_failed: 'The request failed at the OpenAI transport or upstream service boundary.',
  }
  return `Live compiler failed safely: HTTP ${status}, code ${code}. ${guidance[code] ?? 'Inspect the sanitized server error classification.'}`
}

describe('live GPT-5.6 compiler smoke test', () => {
  liveIt('returns a server-validated task plan without exposing raw output', async () => {
    const budget = createInteractionBudget({ policies: DEFAULT_INTERACTION_POLICIES, receiptId: null })
    let status = 0
    let body: unknown
    const headers = new Map<string, string>()
    const response = {
      status(code: number) { status = code; return this },
      setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value) },
      json(value: unknown) { body = value },
      end() {},
    }

    await handler({
      method: 'POST',
      headers: { 'x-forwarded-for': 'live-smoke-test' },
      body: {
        requestId: budget.taskId,
        task: INSURANCE_DENIAL_TASK,
        sources: [{ id: 'source-1', label: 'Insurance denial notice', text: INSURANCE_DENIAL_SOURCE }],
        budget,
      },
    }, response)

    if (status !== 200) throw new Error(liveFailureGuidance(status, body))
    expect(headers.get('cache-control')).toBe('no-store')
    const envelope = body as { plan?: unknown; meta?: { model?: string; repaired?: boolean } }
    expect(envelope.meta?.model).toMatch(/^gpt-5\.6/)
    expect(typeof envelope.meta?.repaired).toBe('boolean')
    expect(parseValidatedTaskPlan(envelope.plan).success).toBe(true)
  }, 60_000)
})
