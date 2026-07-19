import { validateTaskPlan, type CompilerSource } from './evidenceVerification'
import type { TaskPlanCandidate, ValidatedTaskPlan } from './taskPlanSchema'

export const INSURANCE_DENIAL_SOURCE = `INSURANCE DENIAL NOTICE

Notice date: July 15, 2026
Reference number: IR-48291

Your appeal must be received by August 12, 2026.
Include a copy of the denial letter and any supporting medical records.
Submit the appeal through the member portal or by mail to the address on your denial notice.

You may call Member Services if you need help understanding this notice.`

export const INSURANCE_DENIAL_TASK = 'Prepare and submit my insurance denial appeal'

export const INSURANCE_DENIAL_SOURCE_RECORD: CompilerSource = {
  id: 'source-1',
  label: 'Insurance denial notice',
  text: INSURANCE_DENIAL_SOURCE,
}

export const INSURANCE_DENIAL_CANDIDATE: TaskPlanCandidate = {
  version: 1,
  title: 'Submit the insurance appeal',
  summary: 'Gather the required records, draft a short appeal, and submit it before the stated deadline.',
  extractedFacts: [
    {
      id: 'fact-deadline',
      label: 'Appeal deadline',
      value: 'August 12, 2026',
      sourceId: 'source-1',
      evidenceQuote: 'Your appeal must be received by August 12, 2026.',
    },
    {
      id: 'fact-reference',
      label: 'Reference number',
      value: 'IR-48291',
      sourceId: 'source-1',
      evidenceQuote: 'Reference number: IR-48291',
    },
    {
      id: 'fact-records',
      label: 'Required records',
      value: 'Denial letter and supporting medical records',
      sourceId: 'source-1',
      evidenceQuote: 'Include a copy of the denial letter and any supporting medical records.',
    },
  ],
  steps: [
    {
      id: 'read-deadline',
      kind: 'read',
      title: 'Pin the deadline',
      required: true,
      instruction: 'Confirm the deadline and reference number from the notice.',
      body: 'Keep these two facts visible while you prepare the appeal.',
      evidenceFactIds: ['fact-deadline', 'fact-reference'],
    },
    {
      id: 'choose-route',
      kind: 'choice',
      title: 'Choose a submission route',
      required: true,
      prompt: 'Use the route that is easiest to document today.',
      options: [
        { id: 'portal', label: 'Member portal', detail: 'Submit digitally and keep the confirmation.', primary: true },
        { id: 'mail', label: 'Mail', detail: 'Use the address printed on the denial notice.', primary: false },
      ],
    },
    {
      id: 'gather-records',
      kind: 'checklist',
      title: 'Gather the required records',
      required: true,
      instruction: 'Put the required evidence in one folder.',
      items: [
        { id: 'denial-letter', label: 'Copy of the denial letter' },
        { id: 'medical-records', label: 'Supporting medical records' },
      ],
    },
    {
      id: 'draft-appeal',
      kind: 'compose',
      title: 'Draft the appeal note',
      required: true,
      prompt: 'State what decision you are appealing and list the attached records.',
      template: 'Reference IR-48291\n\nI am appealing the denial described in the attached notice. Please review the enclosed supporting medical records and reconsider the decision.',
      placeholder: 'Add any brief context that the reviewer needs.',
    },
    {
      id: 'final-review',
      kind: 'review',
      title: 'Review and submit',
      required: true,
      summary: 'Check the reference, attachments, deadline, and submission confirmation before you finish.',
      includes: ['Reference number', 'Appeal note', 'Required records', 'Submission confirmation'],
    },
  ],
  later: [
    {
      id: 'later-follow-up',
      title: 'Follow up with Member Services',
      body: 'If you want confirmation after submitting, call Member Services and note the date.',
    },
  ],
  output: {
    format: 'plain_text',
    primaryAction: 'copy',
    filename: 'insurance-appeal-plan.txt',
  },
}

export function createInsuranceDenialPlan(): ValidatedTaskPlan {
  const result = validateTaskPlan(INSURANCE_DENIAL_CANDIDATE, [INSURANCE_DENIAL_SOURCE_RECORD])
  if (!result.ok) throw new Error('The canonical insurance fixture failed validation.')
  return result.plan
}
