import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { curation } from '../scripts/ingest/curation'
import type { RawFile } from '../scripts/ingest/rawTypes'

const raw = JSON.parse(readFileSync('data/raw/colors.json', 'utf8')) as RawFile
const slugs = raw.colors.map((c) => c.slug)

describe('curation hierarchy', () => {
  it('assigns every one of the 157 colors exactly once', () => {
    expect(slugs).toHaveLength(157)
    for (const slug of slugs) {
      expect(curation.assignments[slug], `missing assignment for ${slug}`).toBeDefined()
    }
    expect(Object.keys(curation.assignments)).toHaveLength(157)
  })
  it('every assignment points at a defined fine family', () => {
    const fineIds = new Set(curation.fineFamilies.map((f) => f.id))
    for (const [slug, fineId] of Object.entries(curation.assignments)) {
      expect(fineIds.has(fineId), `${slug} → unknown fine "${fineId}"`).toBe(true)
    }
  })
  it('every fine family is non-empty and parented to a broad family', () => {
    const broadIds = new Set(curation.broadFamilies.map((b) => b.id))
    const used = new Set(Object.values(curation.assignments))
    for (const f of curation.fineFamilies) {
      expect(broadIds.has(f.broadId), `fine "${f.id}" → unknown broad`).toBe(true)
      expect(used.has(f.id), `fine family "${f.id}" has no colors`).toBe(true)
    }
  })
  it('every broad family is parented to a super group', () => {
    const superIds = new Set(curation.superGroups.map((s) => s.id))
    for (const b of curation.broadFamilies) {
      expect(superIds.has(b.superId), `broad "${b.id}" → unknown super`).toBe(true)
    }
  })
  it('fine family count is in the target range', () => {
    expect(curation.fineFamilies.length).toBeGreaterThanOrEqual(16)
    expect(curation.fineFamilies.length).toBeLessThanOrEqual(24)
  })
})
