import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { performance } from 'node:perf_hooks'

const base = process.env.DEPLOYED_BASE
if (!base) throw new Error('DEPLOYED_BASE is required')
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const protectionHeaders = bypass ? { 'x-vercel-protection-bypass': bypass } : {}
await fs.mkdir('deployed-evidence', { recursive: true })

const invalid = await fetch(`${base}/api/compile-task`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...protectionHeaders },
  body: '{}',
})
const invalidBody = await invalid.json()
const invalidResult = {
  status: invalid.status,
  cacheControl: invalid.headers.get('cache-control'),
  body: invalidBody,
}
await fs.writeFile('deployed-evidence/invalid-result.json', JSON.stringify(invalidResult, null, 2))
assert.equal(invalid.status, 400)
assert.equal(invalid.headers.get('cache-control'), 'no-store')
assert.deepEqual(invalidBody, { error: { code: 'invalid_request' } })

if (process.env.RUN_OPENAI_LIVE !== '1') process.exit(0)

const now = new Date()
const taskId = `live-${process.env.GITHUB_RUN_ID ?? Date.now()}`.slice(0, 64)
const source = `INSURANCE DENIAL NOTICE

Notice date: July 15, 2026
Reference number: IR-48291

Your appeal must be received by August 12, 2026.
Include a copy of the denial letter and any supporting medical records.
Submit the appeal through the member portal or by mail to the address on your denial notice.

You may call Member Services if you need help understanding this notice.`
const body = {
  requestId: taskId,
  task: 'Prepare and submit my insurance denial appeal',
  sources: [{ id: 'source-1', label: 'Synthetic insurance denial notice', text: source }],
  budget: {
    version: 1,
    budgetId: `budget-${taskId}`.slice(0, 64),
    taskId,
    declaredBy: 'user',
    receiptId: null,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    policies: {
      oneStepAtATime: true,
      fewerDecisions: true,
      protectProgress: true,
      deferOptionalWork: true,
    },
    invariants: {
      supportedStepKinds: ['read', 'choice', 'compose', 'checklist', 'review'],
      maxSteps: 5,
      outputActions: ['copy', 'download'],
    },
  },
}

const started = performance.now()
let response
try {
  response = await fetch(`${base}/api/compile-task`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...protectionHeaders },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(65_000),
  })
} catch (error) {
  const result = { status: 0, totalMs: Math.round(performance.now() - started), repaired: null, error: error instanceof Error ? error.name : 'request_failed' }
  await fs.writeFile('deployed-evidence/live-result.json', JSON.stringify(result, null, 2))
  throw error
}
const totalMs = Math.round(performance.now() - started)
const payload = await response.json().catch(() => null)
const liveResult = {
  status: response.status,
  totalMs,
  repaired: payload?.meta?.repaired ?? null,
  model: payload?.meta?.model ?? null,
  stepCount: Array.isArray(payload?.plan?.steps) ? payload.plan.steps.length : null,
  errorCode: payload?.error?.code ?? null,
  cacheControl: response.headers.get('cache-control'),
}
await fs.writeFile('deployed-evidence/live-result.json', JSON.stringify(liveResult, null, 2))
assert.equal(response.status, 200)
assert.equal(liveResult.model, 'gpt-5.6')
assert.equal(liveResult.stepCount > 0, true)
