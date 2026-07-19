import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INSURANCE_DENIAL_CANDIDATE,
  INSURANCE_DENIAL_SOURCE,
  INSURANCE_DENIAL_TASK,
} from '../src/carry-forward/fixtures'
import { createInteractionBudget, DEFAULT_INTERACTION_POLICIES } from '../src/carry-forward/interactionBudget'

const openaiMocks = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('openai', () => {
  class MockApiError extends Error {
    status = 500
  }
  return {
    default: class MockOpenAI {
      static APIError = MockApiError
      responses = { create: openaiMocks.create }
    },
  }
})

import handler from './compile-task'

function modelResponse(candidate: unknown) {
  return {
    status: 'completed',
    incomplete_details: null,
    output: [],
    output_text: JSON.stringify(candidate),
    model: 'gpt-5.6-sol-test',
  }
}

function request(address: string) {
  return {
    method: 'POST',
    headers: { 'x-forwarded-for': address },
    body: {
      task: INSURANCE_DENIAL_TASK,
      sources: [{ id: 'source-1', label: 'Insurance denial notice', text: INSURANCE_DENIAL_SOURCE }],
      budget: createInteractionBudget({ policies: DEFAULT_INTERACTION_POLICIES, receiptId: null }),
    },
  }
}

function captureResponse() {
  const capture = { status: 0, body: undefined as unknown, headers: new Map<string, string>() }
  return {
    capture,
    response: {
      status(code: number) { capture.status = code; return this },
      setHeader(name: string, value: string) { capture.headers.set(name.toLowerCase(), value) },
      json(value: unknown) { capture.body = value },
      end() {},
    },
  }
}

describe('server-only Carry Forward compiler', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key-never-sent-to-browser'
    openaiMocks.create.mockReset()
  })

  it('uses the bounded GPT-5.6 Responses request contract', async () => {
    openaiMocks.create.mockResolvedValueOnce(modelResponse(INSURANCE_DENIAL_CANDIDATE))
    const { capture, response } = captureResponse()
    await handler(request('contract-test'), response)

    expect(capture.status).toBe(200)
    expect(capture.headers.get('cache-control')).toBe('no-store')
    expect(openaiMocks.create).toHaveBeenCalledTimes(1)
    const call = openaiMocks.create.mock.calls[0][0]
    expect(call).toMatchObject({
      model: 'gpt-5.6',
      store: false,
      tools: [],
      max_output_tokens: 5000,
      reasoning: { effort: 'low' },
      text: { format: { type: 'json_schema', strict: true } },
    })
  })

  it('makes at most one repair using machine-readable codes and paths', async () => {
    const invalid = structuredClone(INSURANCE_DENIAL_CANDIDATE)
    invalid.extractedFacts[0].evidenceQuote = 'A quote that does not exist.'
    openaiMocks.create
      .mockResolvedValueOnce(modelResponse(invalid))
      .mockResolvedValueOnce(modelResponse(INSURANCE_DENIAL_CANDIDATE))

    const { capture, response } = captureResponse()
    await handler(request('repair-test'), response)
    expect(capture.status).toBe(200)
    expect(openaiMocks.create).toHaveBeenCalledTimes(2)

    const repairCall = openaiMocks.create.mock.calls[1][0]
    const repairData = JSON.parse(repairCall.input[1].content) as {
      kind: string
      validationIssues: Array<Record<string, unknown>>
    }
    expect(repairData.kind).toBe('repair_request')
    expect(repairData.validationIssues).toEqual([
      { code: 'quote_missing', path: 'extractedFacts.0.evidenceQuote' },
    ])
    expect(Object.keys(repairData.validationIssues[0])).toEqual(['code', 'path'])
  })

  it('fails closed after the single repair is still invalid', async () => {
    const invalid = structuredClone(INSURANCE_DENIAL_CANDIDATE)
    invalid.extractedFacts[0].evidenceQuote = 'A quote that does not exist.'
    openaiMocks.create
      .mockResolvedValueOnce(modelResponse(invalid))
      .mockResolvedValueOnce(modelResponse(invalid))

    const { capture, response } = captureResponse()
    await handler(request('failed-repair-test'), response)
    expect(capture).toMatchObject({ status: 422, body: { error: { code: 'plan_validation_failed' } } })
    expect(openaiMocks.create).toHaveBeenCalledTimes(2)
  })
})
