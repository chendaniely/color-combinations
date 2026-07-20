import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateDataset } from '../src/core/validate'
import { curation } from '../scripts/ingest/curation'
import type { RawFile } from '../scripts/ingest/rawTypes'
import { transform } from '../scripts/ingest/transform'

const raw = JSON.parse(readFileSync('data/raw/colors.json', 'utf8')) as RawFile
const ds = transform(raw, curation, '2026-07-19')

describe('transform on real data', () => {
  it('produces a valid dataset', () => {
    expect(() => validateDataset(ds)).not.toThrow()
  })
  it('carries all 157 colors and reconstructs all 348 combinations', () => {
    expect(ds.colors).toHaveLength(157)
    expect(ds.combinations).toHaveLength(348)
  })
  it('applies the quirks policy: sizes and exclusions match the known facts', () => {
    const bySize = new Map<number, number>()
    for (const c of ds.combinations) {
      bySize.set(c.size, (bySize.get(c.size) ?? 0) + 1)
    }
    expect(bySize.get(1)).toBe(10)
    expect(bySize.get(2)).toBe(124)
    expect(bySize.get(3)).toBe(112)
    expect(bySize.get(4)).toBe(99)
    expect(bySize.get(5)).toBe(3)
    expect(ds.combinations.filter((c) => c.excluded)).toHaveLength(10)
  })
  it('keeps known values intact (Hermosa Pink)', () => {
    const hermosa = ds.colors.find((c) => c.slug === 'hermosa-pink')!
    expect(hermosa.id).toBe(1)
    expect(hermosa.hex).toBe('#ffb3f0')
    expect(hermosa.rgb).toEqual([255, 179, 240])
    expect(hermosa.cmyk).toEqual([0, 30, 6, 0])
    expect(hermosa.hue).toBeCloseTo(311.84, 1)
    expect(hermosa.combinationIds).toEqual([176, 227, 273])
  })
  it("keeps Vandar Poel's Blue with zero combinations", () => {
    const v = ds.colors.find((c) => c.name.includes('Vandar'))!
    expect(v.combinationIds).toEqual([])
  })
  it('combination colorIds are ascending', () => {
    for (const c of ds.combinations) {
      expect([...c.colorIds].sort((a, b) => a - b)).toEqual(c.colorIds)
    }
  })
})
