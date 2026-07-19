import { describe, expect, it } from 'vitest'
import handler from './compile-task'
import { INSURANCE_DENIAL_SOURCE, INSURANCE_DENIAL_TASK } from '../src/carry-forward/fixtures'
import { createInteractionBudget, DEFAULT_INTERACTION_POLICIES } from '../src/carry-forward/interactionBudget'
import { parseValidatedTaskPlan } from '../src/carry-forward/taskPlanSchema'

const liveIt = process.env.RUN_OPENAI_LIVE === '1' ? it : it.skip

describe('live GPT-5.6 compiler smoke test', () => {
  liveIt('returns a server-validated task plan without exposing raw output', async () => {
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
        task: INSURANCE_DENIAL_TASK,
        sources: [{ id: 'source-1', label: 'Insurance denial notice', text: INSURANCE_DENIAL_SOURCE }],
        budget: createInteractionBudget({ policies: DEFAULT_INTERACTION_POLICIES, receiptId: null }),
      },
    }, response)

    expect({ status, body }).toMatchObject({ status: 200 })
    expect(headers.get('cache-control')).toBe('no-store')
    const envelope = body as { plan?: unknown; meta?: { model?: string; repaired?: boolean } }
    expect(envelope.meta?.model).toMatch(/^gpt-5\.6/)
    expect(typeof envelope.meta?.repaired).toBe('boolean')
    expect(parseValidatedTaskPlan(envelope.plan).success).toBe(true)
  }, 30_000)
})
