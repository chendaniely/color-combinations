// The citation registry underpins every other dataset: each one cites into it
// by id rather than repeating a URL. If this file rots, the claim that the
// seasons are "sourced" stops meaning anything, so the shape is checked hard.
//
// Deliberately OFFLINE. Whether a URL still resolves is a question about the
// internet, not about this repo, and `make test` must never fail because
// someone else's server is down. `make check-links` asks that question.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SOURCES_SCHEMA_VERSION, validateSources } from '../src/core/sources'

const raw = JSON.parse(readFileSync('data/reference/sources.json', 'utf8'))

describe('the citation registry', () => {
  it('is at the expected schema version', () => {
    expect(raw.schemaVersion).toBe(SOURCES_SCHEMA_VERSION)
  })

  it('describes itself', () => {
    expect(raw.description.length).toBeGreaterThan(0)
  })

  it('validates', () => {
    expect(validateSources(raw).length).toBeGreaterThan(0)
  })

  it('gives every source a unique id', () => {
    const ids = raw.sources.map((s: { id: string }) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Every field earns its place: `supports` is what stops a citation being
  // decorative. A source nobody can say a claim for is not a citation.
  it('records what each source actually supports', () => {
    for (const s of validateSources(raw)) {
      expect(s.supports.length, `source ${s.id} claims nothing`).toBeGreaterThan(10)
      expect(s.publisher.length, `source ${s.id} has no publisher`).toBeGreaterThan(0)
      expect(s.title.length, `source ${s.id} has no title`).toBeGreaterThan(0)
    }
  })

  it('uses https everywhere', () => {
    for (const s of validateSources(raw)) {
      expect(s.url.startsWith('https://'), `source ${s.id} is not https`).toBe(true)
    }
  })

  it('dates every access as YYYY-MM-DD', () => {
    for (const s of validateSources(raw)) {
      expect(s.accessed, `source ${s.id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('cites the founding claim the whole design rests on', () => {
    const wada = validateSources(raw).find((s) => s.id === 'artplatform-wada')
    expect(wada, 'the Wada -> JCRI founding source is missing').toBeDefined()
    expect(wada!.url).toContain('artplatform.go.jp')
  })
})

describe('validateSources rejects bad input', () => {
  it('rejects a wrong schemaVersion', () => {
    expect(() => validateSources({ ...raw, schemaVersion: 99 })).toThrow(/schemaVersion/)
  })

  it('rejects a duplicate id', () => {
    const dup = { ...raw, sources: [raw.sources[0], raw.sources[0]] }
    expect(() => validateSources(dup)).toThrow(/duplicate/i)
  })

  it('rejects a missing url', () => {
    const bad = { ...raw, sources: [{ ...raw.sources[0], url: '' }] }
    expect(() => validateSources(bad)).toThrow(/url/i)
  })

  it('rejects a non-object', () => {
    expect(() => validateSources(null)).toThrow()
    expect(() => validateSources([])).toThrow()
  })
})
