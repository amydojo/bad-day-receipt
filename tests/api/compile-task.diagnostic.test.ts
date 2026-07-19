import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import type {
  Response as OpenAIResponse,
  ResponseCreateParamsStreaming,
} from 'openai/resources/responses/responses'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  CARRY_FORWARD_MODEL,
  CARRY_FORWARD_REASONING_EFFORT,
  compilerInstructions,
  compilerUserPayload,
} from '../../api/compile-task'
import { validateTaskPlan, type CompilerSource } from '../../src/carry-forward/evidenceVerification'
import {
  INSURANCE_DENIAL_SOURCE_RECORD,
  INSURANCE_DENIAL_TASK,
} from '../../src/carry-forward/fixtures'
import { DEFAULT_INTERACTION_POLICIES } from '../../src/carry-forward/interactionBudget'
import { TaskPlanCandidateSchema } from '../../src/carry-forward/taskPlanSchema'
import { CARRY_FORWARD_COMPILER_LIMITS } from '../../src/carry-forward/taskPlanLimits'

const RUN_DIAGNOSTICS = process.env.RUN_OPENAI_DIAGNOSTICS === '1'
const DIAGNOSTIC_TIMEOUT_MS = 90_000
const PLAIN_TEXT_MAX_OUTPUT_TOKENS = 32
const MINIMAL_SCHEMA_MAX_OUTPUT_TOKENS = 64
const REQUESTED_SERVICE_TIER = 'auto' as const

const CASE_NAMES = [
  'case_b_plain_low',
  'case_c_plain_none',
  'case_c_plain_low_fallback',
  'case_d_minimal_strict',
  'case_e_task_plan_minimal_input',
  'case_f_task_plan_flagship_input',
] as const

type StaticCaseName = typeof CASE_NAMES[number]
type ReasoningEffort = 'none' | 'low'
type SchemaType = 'none' | 'minimal_strict' | 'task_plan_strict'
type SafeResult =
  | 'success'
  | 'validation_failed'
  | 'response_failed'
  | 'response_incomplete'
  | 'response_cancelled'
  | 'invalid_request'
  | 'not_authorized'
  | 'quota_exhausted'
  | 'rate_limited'
  | 'upstream_error'
  | 'transport_error'
  | 'diagnostic_timeout'

type DiagnosticRecord = {
  event: 'carry_forward_compiler_diagnostic'
  caseName: string
  attempt: 1
  startedAt: string
  requestedModel: string
  resolvedModel: string | null
  reasoningEffort: ReasoningEffort
  requestedServiceTier: typeof REQUESTED_SERVICE_TIER
  resolvedServiceTier: string | null
  schemaType: SchemaType
  structuredOutputs: boolean
  maxOutputTokens: number
  timeToHttpResponseMs: number | null
  timeToFirstEventMs: number | null
  timeToResponseCreatedMs: number | null
  timeToFirstOutputEventMs: number | null
  totalMs: number
  httpStatus: number | null
  responseStatus: string | null
  errorCode: string | null
  clientRequestId: string
  openaiRequestId: string | null
  inputTokens: number | null
  outputTokens: number | null
  reasoningTokens: number | null
  validationPassed: boolean | null
  repaired: false
  result: SafeResult
}

type DiagnosticCase = {
  caseName: StaticCaseName | `tier_${string}`
  model: string
  reasoningEffort: ReasoningEffort
  schemaType: SchemaType
  maxOutputTokens: number
  input: NonNullable<ResponseCreateParamsStreaming['input']>
  text: NonNullable<ResponseCreateParamsStreaming['text']>
  validate(response: OpenAIResponse): boolean
}

const SAFE_SERVICE_TIERS = new Set(['auto', 'default', 'flex', 'scale', 'priority'])
const SAFE_RESPONSE_STATUSES = new Set(['completed', 'failed', 'in_progress', 'cancelled', 'queued', 'incomplete'])
const SAFE_RESULTS = new Set<SafeResult>([
  'success',
  'validation_failed',
  'response_failed',
  'response_incomplete',
  'response_cancelled',
  'invalid_request',
  'not_authorized',
  'quota_exhausted',
  'rate_limited',
  'upstream_error',
  'transport_error',
  'diagnostic_timeout',
])

function safeCaseName(value: string) {
  if ((CASE_NAMES as readonly string[]).includes(value)) return value
  return /^tier_gpt-5\.6(?:-[a-z0-9.-]{1,64})?$/.test(value) ? value : 'unknown'
}

function safeModel(value: string | null) {
  if (value && /^gpt-5\.6(?:-[a-z0-9.-]{1,64})?$/.test(value)) return value
  return value === null ? null : 'unknown'
}

function safeRequestId(value: string | null) {
  if (value && /^[A-Za-z0-9_-]{1,160}$/.test(value)) return value
  return null
}

function safeErrorCode(value: string | null) {
  return value && /^[a-z0-9_]{1,80}$/.test(value) ? value : null
}

function safeElapsed(value: number | null) {
  return value !== null && Number.isFinite(value) && value >= 0 ? Math.round(value) : null
}

function safeCount(value: number | null) {
  return value !== null && Number.isInteger(value) && value >= 0 ? value : null
}

export function diagnosticLogLine(record: DiagnosticRecord) {
  const startedAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.startedAt)
    ? record.startedAt
    : 'unknown'
  return JSON.stringify({
    event: 'carry_forward_compiler_diagnostic',
    caseName: safeCaseName(record.caseName),
    attempt: 1,
    startedAt,
    requestedModel: safeModel(record.requestedModel),
    resolvedModel: safeModel(record.resolvedModel),
    reasoningEffort: record.reasoningEffort === 'none' ? 'none' : 'low',
    requestedServiceTier: REQUESTED_SERVICE_TIER,
    resolvedServiceTier: record.resolvedServiceTier && SAFE_SERVICE_TIERS.has(record.resolvedServiceTier)
      ? record.resolvedServiceTier
      : null,
    schemaType: record.schemaType,
    structuredOutputs: record.structuredOutputs,
    maxOutputTokens: safeCount(record.maxOutputTokens),
    timeToHttpResponseMs: safeElapsed(record.timeToHttpResponseMs),
    timeToFirstEventMs: safeElapsed(record.timeToFirstEventMs),
    timeToResponseCreatedMs: safeElapsed(record.timeToResponseCreatedMs),
    timeToFirstOutputEventMs: safeElapsed(record.timeToFirstOutputEventMs),
    totalMs: safeElapsed(record.totalMs),
    httpStatus: safeCount(record.httpStatus),
    responseStatus: record.responseStatus && SAFE_RESPONSE_STATUSES.has(record.responseStatus)
      ? record.responseStatus
      : null,
    errorCode: safeErrorCode(record.errorCode),
    clientRequestId: safeRequestId(record.clientRequestId),
    openaiRequestId: safeRequestId(record.openaiRequestId),
    inputTokens: safeCount(record.inputTokens),
    outputTokens: safeCount(record.outputTokens),
    reasoningTokens: safeCount(record.reasoningTokens),
    validationPassed: record.validationPassed,
    repaired: false,
    result: SAFE_RESULTS.has(record.result) ? record.result : 'transport_error',
  })
}

function logDiagnostic(record: DiagnosticRecord) {
  console.info(diagnosticLogLine(record))
}

function elapsedSince(startedAt: number) {
  return performance.now() - startedAt
}

function responseResult(response: OpenAIResponse, validationPassed: boolean): SafeResult {
  if (response.status === 'completed') return validationPassed ? 'success' : 'validation_failed'
  if (response.status === 'incomplete') return 'response_incomplete'
  if (response.status === 'cancelled') return 'response_cancelled'
  return 'response_failed'
}

function apiErrorResult(error: InstanceType<typeof OpenAI.APIError>): SafeResult {
  if (error.status === 400 || error.code === 'invalid_request_error') return 'invalid_request'
  if (error.status === 401 || error.status === 403) return 'not_authorized'
  if (error.code === 'insufficient_quota') return 'quota_exhausted'
  if (error.status === 429 || error.code === 'rate_limit_exceeded') return 'rate_limited'
  if (error.code === 'server_error' || (error.status && error.status >= 500)) return 'upstream_error'
  return 'transport_error'
}

async function runDiagnosticCase(openai: OpenAI, definition: DiagnosticCase): Promise<DiagnosticRecord> {
  const startedAtIso = new Date().toISOString()
  const startedAt = performance.now()
  const clientRequestId = `carry-forward-diag-${randomUUID()}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DIAGNOSTIC_TIMEOUT_MS)
  let timeToHttpResponseMs: number | null = null
  let timeToFirstEventMs: number | null = null
  let timeToResponseCreatedMs: number | null = null
  let timeToFirstOutputEventMs: number | null = null
  let httpStatus: number | null = null
  let openaiRequestId: string | null = null
  let finalResponse: OpenAIResponse | null = null

  try {
    const request = openai.responses.create({
      model: definition.model,
      background: false,
      store: false,
      tools: [],
      stream: true,
      service_tier: REQUESTED_SERVICE_TIER,
      max_output_tokens: definition.maxOutputTokens,
      reasoning: { effort: definition.reasoningEffort },
      input: definition.input,
      text: definition.text,
    }, {
      headers: { 'X-Client-Request-Id': clientRequestId },
      maxRetries: 0,
      signal: controller.signal,
      timeout: DIAGNOSTIC_TIMEOUT_MS,
    })
    const streamed = await request.withResponse()
    timeToHttpResponseMs = elapsedSince(startedAt)
    httpStatus = streamed.response.status
    openaiRequestId = streamed.request_id

    for await (const event of streamed.data) {
      if (timeToFirstEventMs === null) timeToFirstEventMs = elapsedSince(startedAt)
      if (event.type === 'response.created' && timeToResponseCreatedMs === null) {
        timeToResponseCreatedMs = elapsedSince(startedAt)
      }
      if (
        timeToFirstOutputEventMs === null
        && (event.type === 'response.output_item.added' || event.type === 'response.output_text.delta')
      ) {
        timeToFirstOutputEventMs = elapsedSince(startedAt)
      }
      if (
        event.type === 'response.completed'
        || event.type === 'response.failed'
        || event.type === 'response.incomplete'
      ) {
        finalResponse = event.response
      }
    }

    const totalMs = elapsedSince(startedAt)
    const validationPassed = finalResponse ? definition.validate(finalResponse) : false
    const result = finalResponse ? responseResult(finalResponse, validationPassed) : 'response_failed'
    const record: DiagnosticRecord = {
      event: 'carry_forward_compiler_diagnostic',
      caseName: definition.caseName,
      attempt: 1,
      startedAt: startedAtIso,
      requestedModel: definition.model,
      resolvedModel: finalResponse?.model ?? null,
      reasoningEffort: definition.reasoningEffort,
      requestedServiceTier: REQUESTED_SERVICE_TIER,
      resolvedServiceTier: finalResponse?.service_tier ?? null,
      schemaType: definition.schemaType,
      structuredOutputs: definition.schemaType !== 'none',
      maxOutputTokens: definition.maxOutputTokens,
      timeToHttpResponseMs,
      timeToFirstEventMs,
      timeToResponseCreatedMs,
      timeToFirstOutputEventMs,
      totalMs,
      httpStatus,
      responseStatus: finalResponse?.status ?? null,
      errorCode: null,
      clientRequestId,
      openaiRequestId,
      inputTokens: finalResponse?.usage?.input_tokens ?? null,
      outputTokens: finalResponse?.usage?.output_tokens ?? null,
      reasoningTokens: finalResponse?.usage?.output_tokens_details.reasoning_tokens ?? null,
      validationPassed,
      repaired: false,
      result,
    }
    logDiagnostic(record)
    return record
  } catch (error) {
    const totalMs = elapsedSince(startedAt)
    const apiError = error instanceof OpenAI.APIError ? error : null
    const record: DiagnosticRecord = {
      event: 'carry_forward_compiler_diagnostic',
      caseName: definition.caseName,
      attempt: 1,
      startedAt: startedAtIso,
      requestedModel: definition.model,
      resolvedModel: null,
      reasoningEffort: definition.reasoningEffort,
      requestedServiceTier: REQUESTED_SERVICE_TIER,
      resolvedServiceTier: null,
      schemaType: definition.schemaType,
      structuredOutputs: definition.schemaType !== 'none',
      maxOutputTokens: definition.maxOutputTokens,
      timeToHttpResponseMs,
      timeToFirstEventMs,
      timeToResponseCreatedMs,
      timeToFirstOutputEventMs,
      totalMs,
      httpStatus: apiError?.status ?? httpStatus,
      responseStatus: null,
      errorCode: apiError?.code ?? null,
      clientRequestId,
      openaiRequestId: apiError?.requestID ?? openaiRequestId,
      inputTokens: null,
      outputTokens: null,
      reasoningTokens: null,
      validationPassed: null,
      repaired: false,
      result: controller.signal.aborted
        ? 'diagnostic_timeout'
        : apiError
          ? apiErrorResult(apiError)
          : 'transport_error',
    }
    logDiagnostic(record)
    return record
  } finally {
    clearTimeout(timer)
  }
}

function parseCompleteJson(response: OpenAIResponse) {
  if (response.status !== 'completed' || response.incomplete_details) return null
  try {
    return JSON.parse(response.output_text) as unknown
  } catch {
    return null
  }
}

function plainTextCase({
  caseName,
  model = CARRY_FORWARD_MODEL,
  reasoningEffort,
}: {
  caseName: StaticCaseName | `tier_${string}`
  model?: string
  reasoningEffort: ReasoningEffort
}): DiagnosticCase {
  return {
    caseName,
    model,
    reasoningEffort,
    schemaType: 'none',
    maxOutputTokens: PLAIN_TEXT_MAX_OUTPUT_TOKENS,
    input: 'Return the word ready.',
    text: { verbosity: 'low' },
    validate: (response) => response.status === 'completed' && response.output_text.trim().length > 0,
  }
}

function taskPlanInput(task: string, sources: CompilerSource[]) {
  return [
    { role: 'developer' as const, content: compilerInstructions() },
    {
      role: 'user' as const,
      content: compilerUserPayload({
        task,
        policies: DEFAULT_INTERACTION_POLICIES,
        sources,
        issues: null,
      }),
    },
  ]
}

function taskPlanCase({
  caseName,
  task,
  sources,
}: {
  caseName: 'case_e_task_plan_minimal_input' | 'case_f_task_plan_flagship_input'
  task: string
  sources: CompilerSource[]
}): DiagnosticCase {
  return {
    caseName,
    model: CARRY_FORWARD_MODEL,
    reasoningEffort: CARRY_FORWARD_REASONING_EFFORT,
    schemaType: 'task_plan_strict',
    maxOutputTokens: CARRY_FORWARD_COMPILER_LIMITS.outputTokens,
    input: taskPlanInput(task, sources),
    text: {
      verbosity: 'low',
      format: zodTextFormat(TaskPlanCandidateSchema, 'carry_forward_task_plan'),
    },
    validate: (response) => {
      const candidate = parseCompleteJson(response)
      return candidate !== null && validateTaskPlan(candidate, sources).ok
    },
  }
}

async function listAccessibleGpt56Models(openai: OpenAI) {
  const clientRequestId = `carry-forward-diag-model-list-${randomUUID()}`
  const listed = await openai.models.list({
    headers: { 'X-Client-Request-Id': clientRequestId },
    maxRetries: 0,
    timeout: DIAGNOSTIC_TIMEOUT_MS,
  }).withResponse()
  const modelIds: string[] = []
  for await (const model of listed.data) {
    if (/^gpt-5\.6(?:-[a-z0-9.-]{1,64})?$/.test(model.id)) modelIds.push(model.id)
  }
  modelIds.sort()
  console.info(JSON.stringify({
    event: 'carry_forward_gpt_5_6_inventory',
    clientRequestId: safeRequestId(clientRequestId),
    openaiRequestId: safeRequestId(listed.request_id),
    modelIds,
  }))
  return modelIds
}

async function retrieveConfiguredModel(openai: OpenAI) {
  const clientRequestId = `carry-forward-diag-model-retrieve-${randomUUID()}`
  const startedAt = performance.now()
  try {
    const retrieved = await openai.models.retrieve(CARRY_FORWARD_MODEL, {
      headers: { 'X-Client-Request-Id': clientRequestId },
      maxRetries: 0,
      timeout: DIAGNOSTIC_TIMEOUT_MS,
    }).withResponse()
    console.info(JSON.stringify({
      event: 'carry_forward_model_retrieval',
      requestedModel: CARRY_FORWARD_MODEL,
      resolvedModel: safeModel(retrieved.data.id),
      totalMs: safeElapsed(elapsedSince(startedAt)),
      httpStatus: retrieved.response.status,
      clientRequestId: safeRequestId(clientRequestId),
      openaiRequestId: safeRequestId(retrieved.request_id),
      result: 'success',
    }))
  } catch (error) {
    const apiError = error instanceof OpenAI.APIError ? error : null
    console.info(JSON.stringify({
      event: 'carry_forward_model_retrieval',
      requestedModel: CARRY_FORWARD_MODEL,
      resolvedModel: null,
      totalMs: safeElapsed(elapsedSince(startedAt)),
      httpStatus: safeCount(apiError?.status ?? null),
      clientRequestId: safeRequestId(clientRequestId),
      openaiRequestId: safeRequestId(apiError?.requestID ?? null),
      result: apiError?.status === 404 ? 'not_found' : apiError ? apiErrorResult(apiError) : 'transport_error',
    }))
  }
}

describe('privacy-safe compiler latency diagnostics', () => {
  it('serializes only allowlisted lifecycle fields', () => {
    const record = {
      event: 'carry_forward_compiler_diagnostic',
      caseName: 'SENSITIVE_TASK_SENTINEL prepare an appeal',
      attempt: 1,
      startedAt: 'not-a-time SENSITIVE_SOURCE_SENTINEL',
      requestedModel: 'SENSITIVE_KEY_SENTINEL',
      resolvedModel: 'SENSITIVE_MODEL_OUTPUT_SENTINEL',
      reasoningEffort: 'low',
      requestedServiceTier: 'auto',
      resolvedServiceTier: 'private-tier',
      schemaType: 'task_plan_strict',
      structuredOutputs: true,
      maxOutputTokens: 5000,
      timeToHttpResponseMs: 10,
      timeToFirstEventMs: 11,
      timeToResponseCreatedMs: 12,
      timeToFirstOutputEventMs: 13,
      totalMs: 14,
      httpStatus: 200,
      responseStatus: 'completed',
      errorCode: 'SENSITIVE_ERROR_SENTINEL',
      clientRequestId: 'unsafe request id SENSITIVE_EVIDENCE_SENTINEL',
      openaiRequestId: null,
      inputTokens: 1,
      outputTokens: 2,
      reasoningTokens: 0,
      validationPassed: true,
      repaired: false,
      result: 'success',
      task: 'SENSITIVE_TASK_SENTINEL',
      source: 'SENSITIVE_SOURCE_SENTINEL',
      output: 'SENSITIVE_MODEL_OUTPUT_SENTINEL',
      evidence: 'SENSITIVE_EVIDENCE_SENTINEL',
      apiKey: 'SENSITIVE_KEY_SENTINEL',
    } as unknown as DiagnosticRecord

    const line = diagnosticLogLine(record)
    const parsed = JSON.parse(line) as Record<string, unknown>
    expect(Object.keys(parsed).sort()).toEqual([
      'attempt',
      'caseName',
      'clientRequestId',
      'event',
      'errorCode',
      'httpStatus',
      'inputTokens',
      'maxOutputTokens',
      'openaiRequestId',
      'outputTokens',
      'reasoningEffort',
      'reasoningTokens',
      'repaired',
      'requestedModel',
      'requestedServiceTier',
      'resolvedModel',
      'resolvedServiceTier',
      'responseStatus',
      'result',
      'schemaType',
      'startedAt',
      'structuredOutputs',
      'timeToFirstEventMs',
      'timeToFirstOutputEventMs',
      'timeToHttpResponseMs',
      'timeToResponseCreatedMs',
      'totalMs',
      'validationPassed',
    ].sort())
    expect(line).not.toContain('SENSITIVE_')
    expect(parsed).toMatchObject({
      caseName: 'unknown',
      requestedModel: 'unknown',
      resolvedModel: 'unknown',
      resolvedServiceTier: null,
      clientRequestId: null,
    })
  })

  const diagnosticIt = RUN_DIAGNOSTICS ? it : it.skip
  diagnosticIt('runs the controlled GPT-5.6 latency ladder sequentially', async () => {
    expect(process.env.OPENAI_API_KEY?.trim(), 'Preview OPENAI_API_KEY is required.').toBeTruthy()
    vi.spyOn(console, 'info').mockImplementation((message) => process.stdout.write(`${String(message)}\n`))
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: DIAGNOSTIC_TIMEOUT_MS })
    const accessibleModels = await listAccessibleGpt56Models(openai)
    await retrieveConfiguredModel(openai)

    const caseB = await runDiagnosticCase(openai, plainTextCase({
      caseName: 'case_b_plain_low',
      reasoningEffort: CARRY_FORWARD_REASONING_EFFORT,
    }))
    const caseC = await runDiagnosticCase(openai, plainTextCase({
      caseName: 'case_c_plain_none',
      reasoningEffort: 'none',
    }))
    if (caseC.httpStatus === 400) {
      await runDiagnosticCase(openai, plainTextCase({
        caseName: 'case_c_plain_low_fallback',
        reasoningEffort: CARRY_FORWARD_REASONING_EFFORT,
      }))
    }

    const readySchema = z.object({ status: z.literal('ready') }).strict()
    await runDiagnosticCase(openai, {
      caseName: 'case_d_minimal_strict',
      model: CARRY_FORWARD_MODEL,
      reasoningEffort: CARRY_FORWARD_REASONING_EFFORT,
      schemaType: 'minimal_strict',
      maxOutputTokens: MINIMAL_SCHEMA_MAX_OUTPUT_TOKENS,
      input: 'Return status ready.',
      text: { verbosity: 'low', format: zodTextFormat(readySchema, 'diagnostic_ready') },
      validate: (response) => readySchema.safeParse(parseCompleteJson(response)).success,
    })

    await runDiagnosticCase(openai, taskPlanCase({
      caseName: 'case_e_task_plan_minimal_input',
      task: 'Create exactly one required checklist step to organize a desk before work.',
      sources: [],
    }))
    await runDiagnosticCase(openai, taskPlanCase({
      caseName: 'case_f_task_plan_flagship_input',
      task: INSURANCE_DENIAL_TASK,
      sources: [INSURANCE_DENIAL_SOURCE_RECORD],
    }))

    if (caseB.totalMs > CARRY_FORWARD_COMPILER_LIMITS.attemptTimeoutMs) {
      for (const model of accessibleModels) {
        await runDiagnosticCase(openai, plainTextCase({
          caseName: `tier_${model}`,
          model,
          reasoningEffort: CARRY_FORWARD_REASONING_EFFORT,
        }))
      }
    }
  }, 12 * 60_000)
})
