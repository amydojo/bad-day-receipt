const DOJO_LAB_URL = 'https://dojo-lab.vercel.app'

interface DojoArtifact {
  schemaVersion: '1.0.0'
  id: string
  catalogNumber: string
  machineId: 'SM-001'
  machineVersion: string
  title: string
  series: string
  artifactType: string
  createdAt: string
  maker: 'DAMYO'
  condition: string
  observation: string
  tags: string[]
  source: {
    retention: 'summary'
    summary: string
  }
  data: {
    receiptNumber: string
    total: number
    paperName: string
    verdict: string
    releaseId: 'LD-001'
  }
  media: []
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function statusForTotal(total: number): string {
  if (total >= 90) return 'please be extremely gentle'
  if (total >= 60) return 'system under load'
  if (total >= 35) return 'survivable'
  if (total >= 15) return 'dented but operational'
  return 'weird little day'
}

function totalFromShareText(shareText: string): number {
  const match = shareText.match(/Today cost \$([\d,.]+) according to/)
  if (!match) return 0
  const total = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(total) ? total : 0
}

function artifactId(receiptNumber: string): string {
  const normalized = receiptNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `ld-001-${normalized}-${Date.now()}`
}

export function createDojoArchiveHandoffUrl(input: {
  receiptNumber: string
  paperName: string
  shareText: string
}): string {
  const total = totalFromShareText(input.shareText)
  const verdict = statusForTotal(total)
  const createdAt = new Date().toISOString()
  const catalogSuffix = input.receiptNumber.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const artifact: DojoArtifact = {
    schemaVersion: '1.0.0',
    id: artifactId(input.receiptNumber),
    catalogNumber: `SM-001-${catalogSuffix}`,
    machineId: 'SM-001',
    machineVersion: '1.0.0',
    title: 'Bad Day Receipt',
    series: 'The Human Condition',
    artifactType: 'thermal-evidence',
    createdAt,
    maker: 'DAMYO',
    condition: verdict,
    observation: 'A shapeless bad day made finite and registered as proof of survival.',
    tags: ['LD-001', 'SM-001', 'bad-day-receipt', 'thermal-evidence'],
    source: {
      retention: 'summary',
      summary: `${input.receiptNumber} · ${input.paperName} · $${total.toFixed(2)} · ${verdict}`,
    },
    data: {
      receiptNumber: input.receiptNumber,
      total,
      paperName: input.paperName,
      verdict,
      releaseId: 'LD-001',
    },
    media: [],
  }

  const url = new URL('/archive/import', DOJO_LAB_URL)
  url.searchParams.set('artifact', toBase64Url(JSON.stringify(artifact)))
  return url.toString()
}
