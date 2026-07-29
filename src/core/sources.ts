// The citation registry: where every factual claim in the colour-analysis
// datasets points back to.
//
// It lives in the pure kernel because it is only shape-checking — no colour
// science, no network. Whether a URL still RESOLVES is deliberately not
// checked here; see tests/sources.test.ts for why `make test` must never
// depend on someone else's server being up.
//
// Core kernel: no imports outside src/core. The JSON is loaded and validated
// by src/data.ts, the one module allowed to touch data files.

export const SOURCES_SCHEMA_VERSION = 1

export interface Source {
  id: string
  title: string
  publisher: string
  url: string
  /** ISO date the URL was last verified by a human or by `make check-links`. */
  accessed: string
  /** The specific claim this source is cited for. */
  supports: string
  /**
   * Readable in a browser but rejects automated readers. Recorded so nobody
   * re-tests a page that was never going to answer, and so `make check-links`
   * can treat a 403 from it as expected rather than as rot.
   */
  botBlocked?: boolean
}

function fail(msg: string): never {
  throw new Error(`Invalid sources.json: ${msg}`)
}

export function validateSources(data: unknown): Source[] {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) fail('not an object')
  const d = data as { schemaVersion?: number; description?: string; sources?: unknown }
  if (d.schemaVersion !== SOURCES_SCHEMA_VERSION) {
    fail(`schemaVersion ${d.schemaVersion} != expected ${SOURCES_SCHEMA_VERSION}`)
  }
  if (typeof d.description !== 'string' || !d.description) fail('description missing')
  if (!Array.isArray(d.sources) || d.sources.length === 0) fail('sources missing or empty')

  const seen = new Set<string>()
  for (const raw of d.sources) {
    const s = raw as Source
    if (!s.id) fail('a source has no id')
    if (seen.has(s.id)) fail(`duplicate source id "${s.id}"`)
    seen.add(s.id)
    if (!s.title) fail(`source "${s.id}" has no title`)
    if (!s.publisher) fail(`source "${s.id}" has no publisher`)
    if (!s.url || !s.url.startsWith('https://')) fail(`source "${s.id}" has no https url`)
    if (!s.accessed || !/^\d{4}-\d{2}-\d{2}$/.test(s.accessed)) {
      fail(`source "${s.id}" has no YYYY-MM-DD accessed date`)
    }
    // A source that supports nothing in particular is decoration. Requiring a
    // sentence here is what keeps the registry honest as it grows.
    if (!s.supports || s.supports.length < 10) fail(`source "${s.id}" does not say what it supports`)
    if (s.botBlocked !== undefined && typeof s.botBlocked !== 'boolean') {
      fail(`source "${s.id}" has a non-boolean botBlocked`)
    }
  }
  return d.sources as Source[]
}

/** The ids present, for other datasets to validate their citations against. */
export function sourceIds(sources: Source[]): Set<string> {
  return new Set(sources.map((s) => s.id))
}
