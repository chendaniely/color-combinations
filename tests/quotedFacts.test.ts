// Numbers the site quotes at visitors, checked against the book.
//
// This file exists because of a specific failure. For several releases the You
// tab, the About panel and the README all told visitors "109 of its 157 colours
// read warm against 48 cool". Nothing computed the 109. The rule that actually
// decides warm from cool — `isWarm`, the same one the palette scorer uses —
// gives 110 and 47. A number sitting in prose, wrong, in three places, shown to
// every visitor as an honest disclosure about the book's bias.
//
// The counts are now derived at load (`warmCool` in src/data.ts) so they cannot
// be wrong. This file guards the things derivation alone does not: that the
// derivation matches the rule, that the totals still add up, and that no one
// re-hardcodes them later.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isWarm, temperatureOf } from '../src/color/personalPalette'
import { dataset, warmCool } from '../src/data'

describe('the warm/cool split the site quotes', () => {
  it('accounts for every colour in the book', () => {
    expect(warmCool.warm + warmCool.cool).toBe(dataset.data.colors.length)
  })

  it('matches an independent count using the same rule', () => {
    const warm = dataset.data.colors.filter(isWarm).length
    expect(warmCool.warm).toBe(warm)
    expect(warmCool.cool).toBe(dataset.data.colors.length - warm)
  })

  it('agrees with the temperature axis the scorer uses', () => {
    // isWarm is temperatureOf > 0, and the scorer's own branch is the same
    // expression. If these ever diverge, the palette and the disclosure would
    // be describing different rules.
    for (const color of dataset.data.colors) {
      expect(isWarm(color)).toBe(temperatureOf(color) > 0)
    }
  })

  it('still shows the book leaning warm, which is why the disclosure exists', () => {
    expect(warmCool.warm).toBeGreaterThan(warmCool.cool)
  })
})

// The counts must stay DERIVED. Re-typing them into a component is exactly how
// the original defect happened, and it would pass every other test here.
describe('nothing re-hardcodes the counts', () => {
  const sources = [
    'src/components/you/PaletteTabs.tsx',
    'src/components/AboutPanel.tsx',
  ]

  it('reads them from src/data.ts rather than restating them', () => {
    for (const file of sources) {
      const src = readFileSync(file, 'utf8')
      expect(src, `${file} should read warmCool`).toContain('warmCool')
    }
  })

  it('contains no literal warm/cool count outside a comment', () => {
    // The real values, and the wrong ones that shipped, in the same check: a
    // literal count of either kind means somebody stopped deriving it.
    const literals = [String(warmCool.warm), String(warmCool.cool), '109', '48']
    for (const file of sources) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        // Comments may name them — the fix explains itself by quoting the old
        // numbers, and that documentation has to stay legal.
        if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)) return
        for (const n of literals) {
          expect(
            line.includes(`= ${n}`) || line.includes(`{${n}}`),
            `${file}:${i + 1} hardcodes ${n}; read warmCool from src/data.ts instead`,
          ).toBe(false)
        }
      })
    }
  })
})

// Other numbers the docs quote about the book. Cheap to check, and each one was
// written by hand at some point.
describe('the book totals quoted in the docs', () => {
  it('has the 157 colours the README and About panel claim', () => {
    expect(dataset.data.colors.length).toBe(157)
  })

  it('has the 348 combinations the About panel claims', () => {
    expect(dataset.data.combinations.length).toBe(348)
  })

  it('shows 338 of them, the rest being the excluded one-colour entries', () => {
    // The About panel says "ten one-color entries in the source are hidden as
    // data errors": 348 - 10 = 338.
    const shown = dataset.data.combinations.filter((c) => !c.excluded)
    expect(shown.length).toBe(338)
    expect(dataset.data.combinations.length - shown.length).toBe(10)
  })

  it('has exactly one colour in no combination, as TODO.md records', () => {
    const orphans = dataset.data.colors.filter((c) => c.combinationIds.length === 0)
    expect(orphans).toHaveLength(1)
    expect(orphans[0].name).toContain('Vandar Poel')
  })
})
