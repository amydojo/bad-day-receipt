import { gzipSync } from 'node:zlib'
import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const DIST = new URL('../dist/', import.meta.url)
const INITIAL_JS_BUDGET = 200 * 1024

const files = await walk(DIST)
const rows = []
let initialCompressedJavaScript = 0

for (const file of files) {
  const extension = extname(file.pathname)
  if (!['.js', '.css'].includes(extension)) continue
  const bytes = await readFile(file)
  const compressed = gzipSync(bytes).byteLength
  const path = relative(DIST.pathname, file.pathname)
  rows.push({ path, raw: bytes.byteLength, gzip: compressed })
  if (extension === '.js' && !path.includes('renderReceiptExport')) {
    initialCompressedJavaScript += compressed
  }
}

rows.sort((a, b) => b.gzip - a.gzip)
console.table(rows)
console.log(`Initial compressed JavaScript: ${format(initialCompressedJavaScript)}`)
console.log(`Budget: ${format(INITIAL_JS_BUDGET)}`)

if (initialCompressedJavaScript > INITIAL_JS_BUDGET) {
  console.error('Bundle budget exceeded.')
  process.exitCode = 1
}

async function walk(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name, directory)
    if (entry.isDirectory()) output.push(...await walk(new URL(`${entry.name}/`, directory)))
    else if ((await stat(url)).isFile()) output.push(url)
  }
  return output
}

function format(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB gzip`
}
