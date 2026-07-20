import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from '@playwright/test'

const base = process.env.DEPLOYED_BASE
if (!base) throw new Error('DEPLOYED_BASE is required')
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const protectionHeaders = bypass ? {
  'x-vercel-protection-bypass': bypass,
  'x-vercel-set-bypass-cookie': 'true',
} : {}
const evidenceDir = 'deployed-evidence'
await fs.mkdir(evidenceDir, { recursive: true })

const task = 'Prepare and submit my insurance denial appeal'
const source = `INSURANCE DENIAL NOTICE

Notice date: July 15, 2026
Reference number: IR-48291

Your appeal must be received by August 12, 2026.
Include a copy of the denial letter and any supporting medical records.
Submit the appeal through the member portal or by mail to the address on your denial notice.

You may call Member Services if you need help understanding this notice.`
const facts = [
  ['fact-deadline', 'Appeal deadline', 'August 12, 2026', 'Your appeal must be received by August 12, 2026.'],
  ['fact-reference', 'Reference number', 'IR-48291', 'Reference number: IR-48291'],
  ['fact-records', 'Required records', 'a copy of the denial letter and any supporting medical records', 'Include a copy of the denial letter and any supporting medical records.'],
].map(([id, label, value, evidenceQuote]) => {
  const startOffset = source.indexOf(evidenceQuote)
  return { id, label, value, sourceId: 'source-1', evidenceQuote, startOffset, endOffset: startOffset + evidenceQuote.length }
})
const plan = {
  version: 1,
  id: 'insurance-appeal-plan',
  title: 'Submit the insurance appeal',
  goal: 'Prepare a complete insurance appeal package and submit it through the chosen route.',
  completionDefinition: 'The appeal note and required records are submitted, and a confirmation is saved.',
  summary: 'Confirm the appeal deadline and reference number, gather the required records, choose a submission route, draft the appeal, and review the evidence, contact details, and deadline before taking any external action.',
  extractedFacts: facts,
  steps: [
    { id: 'read-deadline', kind: 'read', title: 'Pin the deadline', required: true, instruction: 'Confirm the deadline and reference number from the notice.', body: 'Keep these two facts visible while you prepare the appeal.', evidenceFactIds: ['fact-deadline', 'fact-reference'] },
    { id: 'choose-route', kind: 'choice', title: 'Choose a submission route', required: true, prompt: 'Use the route that is easiest to document today.', options: [{ id: 'portal', label: 'Member portal', detail: 'Submit digitally and keep the confirmation.', primary: true }, { id: 'mail', label: 'Mail', detail: 'Use the address printed on the denial notice.', primary: false }] },
    { id: 'gather-records', kind: 'checklist', title: 'Gather the required records', required: true, instruction: 'Put the required evidence in one folder.', items: [{ id: 'denial-letter', label: 'Copy of the denial letter' }, { id: 'medical-records', label: 'Supporting medical records' }] },
    { id: 'draft-appeal', kind: 'compose', title: 'Draft the appeal note', required: true, prompt: 'State what decision you are appealing and list the attached records.', template: 'Reference IR-48291\n\nI am appealing the denial described in the attached notice. Please review the enclosed supporting medical records and reconsider the decision.', placeholder: 'Add any brief context that the reviewer needs.' },
    { id: 'final-review', kind: 'review', title: 'Review before submission', required: true, summary: 'Review the appeal, evidence, contact details, and deadline before taking any external action.', includes: ['Appeal draft', 'Supporting document checklist', 'Submission method', 'Deadline and contact details'] },
  ],
  later: [{ id: 'later-follow-up', title: 'Follow up with Member Services', body: 'If you want confirmation after submitting, call Member Services and note the date.' }],
  output: { format: 'plain_text' },
}
const compilerResponse = JSON.stringify({ plan, meta: { model: 'gpt-5.6-sol-test', repaired: false } })
const results = { base, states: {}, focusRestored: false, reducedMotionSeconds: null, directEntry: false, receiptEntry: false, ambiguityRequests: 0 }

function stateRecord(page, name) {
  return page.evaluate(() => ({
    code: document.querySelector('.cf-app')?.getAttribute('data-screen'),
    heading: document.querySelector('h1')?.textContent?.trim(),
    actions: [...document.querySelectorAll('button')].filter((button) => button.offsetParent !== null).map((button) => button.textContent?.trim()).filter(Boolean),
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  })).then((record) => {
    assert.ok(record.code, `${name} must expose a canonical screen code`)
    assert.ok(record.documentWidth <= record.viewport + 1, `${name} must not overflow horizontally`)
    results.states[name] = record
  })
}

async function capture(page, name, viewports = [{ suffix: 'mobile', width: 390, height: 844 }]) {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.screenshot({ path: `${evidenceDir}/${name}-${viewport.suffix}.png`, fullPage: true })
    await stateRecord(page, `${name}-${viewport.suffix}`)
  }
}

const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: protectionHeaders })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.sessionStorage.setItem('bad-day-receipt:carry-forward-seed:v1', JSON.stringify({ receiptId: 'BDR-DEPLOYED-001' }))
  })
  await page.route('**/api/compile-task', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: compilerResponse }))
  await page.goto(`${base}/carry-forward`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M01')
  results.receiptEntry = true
  await capture(page, 'M01', [{ suffix: 'mobile', width: 390, height: 844 }, { suffix: 'desktop', width: 1440, height: 900 }])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: /CARRY ONE THING FORWARD/ }).click()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M02')
  await capture(page, 'M02', [{ suffix: 'narrow', width: 320, height: 568 }, { suffix: 'mobile', width: 390, height: 844 }])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByLabel('WHAT STILL NEEDS DOING?').fill(task)
  await page.getByRole('button', { name: /ADD TASK CONTEXT/ }).click()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M03')
  await capture(page, 'M03')
  await page.getByLabel(/OPTIONAL SOURCE CONTEXT/).fill(source)
  await page.getByRole('button', { name: /DECLARE INTERACTION BUDGET/ }).click()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M04')
  await capture(page, 'M04')
  await page.getByRole('button', { name: /PREVIEW CHANGES/ }).click()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M05')
  await capture(page, 'M05', [{ suffix: 'mobile', width: 390, height: 844 }, { suffix: 'desktop', width: 1440, height: 900 }])

  await page.unroute('**/api/compile-task')
  await page.route('**/api/compile-task', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500))
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: compilerResponse }) } catch {}
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: /BEGIN ONE THING MODE/ }).click()
  await page.locator('.cf-app[data-screen="M06"]').waitFor()
  await capture(page, 'M06', [{ suffix: 'mobile', width: 390, height: 844 }, { suffix: 'desktop', width: 1440, height: 900 }])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'CANCEL' }).click()
  await page.locator('.cf-app[data-screen="M05"]').waitFor()
  await page.waitForTimeout(1_700)
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M05')

  await page.unroute('**/api/compile-task')
  await page.route('**/api/compile-task', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: compilerResponse }))
  await page.getByRole('button', { name: /BEGIN ONE THING MODE/ }).click()
  await page.getByRole('heading', { name: 'Pin the deadline' }).waitFor()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M08')
  await capture(page, 'M08-read')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M07')
  await capture(page, 'M07', [{ suffix: 'mobile', width: 390, height: 844 }, { suffix: 'desktop', width: 1440, height: 900 }])
  await page.setViewportSize({ width: 390, height: 844 })

  const whyTrigger = page.getByRole('button', { name: 'WHY THIS VIEW' })
  await whyTrigger.click()
  await page.getByRole('dialog', { name: /Why this view/ }).waitFor()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M11')
  await capture(page, 'M11', [{ suffix: 'mobile', width: 390, height: 844 }, { suffix: 'desktop', width: 1440, height: 900 }])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.keyboard.press('Escape')
  await page.getByRole('dialog', { name: /Why this view/ }).waitFor({ state: 'hidden' })
  await page.waitForTimeout(100)
  results.focusRestored = await whyTrigger.evaluate((element) => element === document.activeElement)
  assert.equal(results.focusRestored, true, 'Why This View must restore focus to its trigger')

  await page.getByRole('radio', { name: /Member portal/ }).check()
  await page.getByRole('button', { name: /SHOW ALL CHOICES/ }).click()
  await page.getByRole('button', { name: 'Confirm choice', exact: true }).click()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M08')
  await capture(page, 'M08-checklist')
  await page.getByRole('checkbox', { name: 'Copy of the denial letter' }).check()
  await page.getByRole('checkbox', { name: 'Supporting medical records' }).check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M09')
  await capture(page, 'M09')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M10')
  await capture(page, 'M10')
  await page.getByRole('button', { name: 'Close this task', exact: true }).click()
  await page.getByRole('heading', { name: 'One thing closed.' }).waitFor()
  assert.equal(await page.locator('.cf-app').getAttribute('data-screen'), 'M12')
  assert.match(await page.locator('body').innerText(), /did not send, submit, file, approve, or resolve/i)
  await capture(page, 'M12', [{ suffix: 'mobile', width: 390, height: 844 }, { suffix: 'desktop', width: 1440, height: 900 }])
  await context.close()

  const directContext = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: protectionHeaders })
  const directPage = await directContext.newPage()
  await directPage.goto(`${base}/carry-forward`, { waitUntil: 'networkidle' })
  assert.equal(await directPage.locator('.cf-app').getAttribute('data-screen'), 'M02')
  assert.equal(await directPage.getByText('TEMPORARY SERVICE ADJUSTMENT AVAILABLE').count(), 0)
  results.directEntry = true
  await directContext.close()

  const ambiguityContext = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: protectionHeaders })
  const ambiguityPage = await ambiguityContext.newPage()
  await ambiguityPage.route('**/api/compile-task', async (route) => { results.ambiguityRequests += 1; await route.abort() })
  await ambiguityPage.goto(`${base}/carry-forward`, { waitUntil: 'networkidle' })
  await ambiguityPage.getByLabel('WHAT STILL NEEDS DOING?').fill('Deal with that thing')
  await ambiguityPage.getByRole('button', { name: /ADD TASK CONTEXT/ }).click()
  assert.equal(await ambiguityPage.locator('.cf-app').getAttribute('data-screen'), 'M13')
  await capture(ambiguityPage, 'M13', [{ suffix: 'narrow', width: 320, height: 568 }, { suffix: 'mobile', width: 390, height: 844 }, { suffix: 'desktop', width: 1440, height: 900 }])
  assert.equal(results.ambiguityRequests, 0)
  await ambiguityContext.close()

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', extraHTTPHeaders: protectionHeaders })
  const reducedPage = await reducedContext.newPage()
  await reducedPage.goto(`${base}/carry-forward`, { waitUntil: 'networkidle' })
  results.reducedMotionSeconds = await reducedPage.locator('.cf-authored-scene').evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration))
  assert.ok(results.reducedMotionSeconds <= 0.001)
  await reducedContext.close()

  await fs.writeFile(`${evidenceDir}/deployed-browser-result.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
