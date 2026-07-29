import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { wheelNodes } from '../src/core/chord'
import { ancestorAtLevel, index, isColorKey, keyColorId } from '../src/core/dataset'
import { validateDataset } from '../src/core/validate'
import type { GranularityLevel } from '../src/core/types'

const real = index(validateDataset(
  JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8'))))

// redAnchorAngle (src/core/chord.ts) puts the Red family at 12 o'clock by
// taking the MIN startAngle and MAX endAngle of Red's nodes and treating the
// span between them as one block. That is only the right answer while a
// family's nodes sit next to each other on the wheel.
//
// Nothing enforced it. The curated `fine` order happens to group families
// together, so it holds today — but if a future dataset or a re-curation
// interleaved them, the "block centre" would span most of the wheel, the
// anchor would drift off-top, and every level would render subtly rotated with
// no error raised anywhere. This turns that silent drift into a failing test.
//
// The family lookup is rebuilt here from the public dataset API rather than
// reaching for chord.ts's private broadKeyOf: the property under test belongs
// to the DATA (the curated ordering), and widening a module's API to reach a
// helper is a poor reason to change its shape.
function broadOf(nodeKey: string): string | null {
  if (isColorKey(nodeKey)) return ancestorAtLevel(real, keyColorId(nodeKey), 2)
  const fine = real.data.groups.fine.find((g) => g.id === nodeKey)
  if (fine) return fine.parentId
  const broad = real.data.groups.broad.find((g) => g.id === nodeKey)
  if (broad) return broad.id
  return null
}

describe('each broad family occupies one contiguous run on the wheel', () => {
  for (const level of [0, 1, 2] as GranularityLevel[]) {
    it(`holds at granularity level ${level}`, () => {
      const families = wheelNodes(real, level).map((n) => broadOf(n.key))

      // Walk the order once, counting how many separate runs each family forms.
      const runs = new Map<string, number>()
      families.forEach((f, i) => {
        if (f === null) return
        if (i === 0 || families[i - 1] !== f) runs.set(f, (runs.get(f) ?? 0) + 1)
      })

      const broken = [...runs.entries()].filter(([, count]) => count > 1)
      expect(
        broken.map(([family, count]) => `${family} is split into ${count} runs`),
        'a broad family is interleaved with others — redAnchorAngle would drift',
      ).toEqual([])
    })
  }

  it('actually has families to check, so it cannot pass vacuously', () => {
    const nodes = wheelNodes(real, 0)
    const families = new Set(nodes.map((n) => broadOf(n.key)))
    expect(nodes.length).toBeGreaterThan(100)
    expect(families.size).toBeGreaterThan(5)
    expect(families.has(null)).toBe(false)
  })
})
