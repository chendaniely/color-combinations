// Asks whether every cited URL still resolves.
//
// Deliberately NOT part of `make test` or CI. Whether someone else's server is
// up is a question about the internet, not about this repo, and a green test
// suite must never depend on it. Run this when you touch sources.json, or
// periodically to find rot.
//
// Run with: make check-links
import { readFileSync } from 'node:fs'
import { validateSources, type Source } from '../src/core/sources'

const sources = validateSources(JSON.parse(readFileSync('data/reference/sources.json', 'utf8')))

// Some hosts reject an unfamiliar agent outright. Presenting as a browser is
// not evasion here — we are asking the same question a reader would.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
}

async function status(url: string): Promise<number | string> {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
    return res.status
  } catch (err) {
    return err instanceof Error ? err.message.slice(0, 40) : 'failed'
  }
}

function verdict(s: Source, code: number | string): { ok: boolean; note: string } {
  if (typeof code === 'number' && code >= 200 && code < 300) return { ok: true, note: '' }
  // A botBlocked page is expected to refuse us; that is why it carries the flag.
  if (s.botBlocked && (code === 403 || code === 401 || code === 429)) {
    return { ok: true, note: 'refuses robots, as recorded' }
  }
  if (s.botBlocked) return { ok: true, note: `unexpected ${code}, but marked botBlocked` }
  return { ok: false, note: 'ROTTED — fix or remove the citation' }
}

const results = await Promise.all(
  sources.map(async (s) => {
    const code = await status(s.url)
    return { s, code, ...verdict(s, code) }
  }),
)

for (const r of results) {
  const flag = r.ok ? '  ' : '!!'
  console.log(`${flag} ${String(r.code).padEnd(6)} ${r.s.id.padEnd(26)} ${r.note}`)
  if (!r.ok) console.log(`     ${r.s.url}`)
}

const broken = results.filter((r) => !r.ok)
console.log(`\n${results.length - broken.length}/${results.length} citations resolve.`)
if (broken.length) {
  console.error(`\n${broken.length} citation(s) rotted. A citation that 404s is worse than none.`)
  process.exit(1)
}
