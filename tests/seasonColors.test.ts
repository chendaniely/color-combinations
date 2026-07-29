// The join table is generated and committed, exactly as colors-data.json is.
// The point of this test is that it cannot drift: if someone edits the rules
// and forgets to regenerate, or hand-edits the table, the two stop agreeing
// and this fails with the reason.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildSeasonColors, SEASON_COLORS_PATH, serialise } from '../scripts/build-season-colors'
import { fitBand } from '../src/color/colorDistance'
import { validateSeasonColors } from '../src/core/seasonColors'

const committed = readFileSync(SEASON_COLORS_PATH, 'utf8')
const parsed = JSON.parse(committed)
const colors = JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8')).colors
const rules = JSON.parse(readFileSync('data/curated/season-rules.json', 'utf8'))

const seasonIds = new Set<string>(rules.subSeasons.map((s: { id: string }) => s.id))
const colorIds = new Set<number>(colors.map((c: { id: number }) => c.id))
const entries = validateSeasonColors(parsed, seasonIds, colorIds, fitBand)

describe('the committed join table', () => {
  it('is exactly what regenerating produces', () => {
    expect(
      serialise(buildSeasonColors()),
      'data/processed/season-colors.json is stale — run `npm run build-season-colors`',
    ).toBe(committed)
  })

  it('records the script that generates it', () => {
    expect(parsed.generatedBy).toBe('scripts/build-season-colors.ts')
  })

  it('warns in its own description that these are closest matches, not season colours', () => {
    expect(parsed.description).toMatch(/CLOSEST MATCHES IN THE BOOK/)
    expect(parsed.description).toMatch(/not season colours/i)
  })
})

describe('every row resolves', () => {
  it('references a season that exists', () => {
    for (const e of entries) expect(seasonIds.has(e.seasonId), `${e.seasonId}`).toBe(true)
  })

  it('references a colour that exists', () => {
    for (const e of entries) expect(colorIds.has(e.colorId), `colour ${e.colorId}`).toBe(true)
  })

  it('lists each colour at most once per season', () => {
    const seen = new Set<string>()
    for (const e of entries) {
      const key = `${e.seasonId}/${e.colorId}`
      expect(seen.has(key), `duplicate ${key}`).toBe(false)
      seen.add(key)
    }
  })

  it('gives every season at least one colour', () => {
    for (const id of seasonIds) {
      expect(entries.some((e) => e.seasonId === id), `${id} has no colours`).toBe(true)
    }
  })
})

describe('validateSeasonColors rejects bad input', () => {
  it('rejects an unknown season', () => {
    const bad = { ...parsed, entries: [{ ...parsed.entries[0], seasonId: 'not-a-season' }] }
    expect(() => validateSeasonColors(bad, seasonIds, colorIds, fitBand)).toThrow(/not-a-season/)
  })

  it('rejects an unknown colour', () => {
    const bad = { ...parsed, entries: [{ ...parsed.entries[0], colorId: 999999 }] }
    expect(() => validateSeasonColors(bad, seasonIds, colorIds, fitBand)).toThrow(/999999/)
  })

  it('rejects a band that does not match its distance', () => {
    const bad = {
      ...parsed,
      entries: [{ ...parsed.entries[0], distance: 0.9, band: 'very close' }],
    }
    expect(() => validateSeasonColors(bad, seasonIds, colorIds, fitBand)).toThrow(/band/i)
  })

  it('rejects a wrong schemaVersion', () => {
    expect(() => validateSeasonColors({ ...parsed, schemaVersion: 7 }, seasonIds, colorIds, fitBand))
      .toThrow(/schemaVersion/)
  })
})
