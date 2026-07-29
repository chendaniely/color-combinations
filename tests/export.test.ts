import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { index } from '../src/core/dataset'
import { cssVariablesFor, cssVarName, jsonFor } from '../src/core/export'
import { validateDataset } from '../src/core/validate'
import { mini } from './fixtures/miniDataset'

const ix = index(mini)
const combo = ix.comboById.get(10)! // Test Pink A + Test Blue A

const real = index(validateDataset(
  JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8'))))

describe('export formatters', () => {
  it('formats CSS custom properties', () => {
    expect(cssVariablesFor(ix, combo)).toBe(
      `/* Sanzo Wada combination 10 — Test Pink A, Test Blue A */\n` +
      `:root {\n  --test-pink-a: #ffa6d9;\n  --test-blue-a: #236192;\n}\n`,
    )
  })
  // Five of the book's colours carry punctuation a slug keeps and CSS rejects:
  // "Hay's Russet", "Pale King's Blue", "Vandar Poel's Blue" (apostrophes) and
  // "Eugenia Red | A" / "| B" (pipes). Emitted raw they produced
  // `--hay's-russet: …`, which is invalid CSS a browser drops — and that was 28
  // of 338 combinations handing out a broken stylesheet from Copy CSS.
  describe('CSS custom property names are valid identifiers', () => {
    it('every colour in the real book produces a usable name', () => {
      const invalid = real.data.colors
        .map((c) => ({ slug: c.slug, name: cssVarName(c.slug) }))
        .filter(({ name }) => !/^-?[a-z_][a-z0-9_-]*$/.test(name))
      expect(invalid, 'these would be dropped by a browser').toEqual([])
    })

    it('keeps every colour distinct — sanitising must not merge two colours', () => {
      const names = real.data.colors.map((c) => cssVarName(c.slug))
      expect(new Set(names).size).toBe(names.length)
    })

    it('strips the punctuation that actually occurs in the book', () => {
      expect(cssVarName("hay's-russet")).toBe('hays-russet')
      expect(cssVarName('eugenia-red-|-a')).toBe('eugenia-red-a')
      expect(cssVarName('eugenia-red-|-b')).toBe('eugenia-red-b')
    })

    it('never emits a name a browser would reject, across every combination', () => {
      for (const c of real.data.combinations) {
        if (c.excluded) continue
        for (const line of cssVariablesFor(real, c).split('\n')) {
          const m = line.match(/^\s*--([^:]+):/)
          if (m) expect(m[1], `combination ${c.id}`).toMatch(/^[a-z][a-z0-9-]*$/)
        }
      }
    })

    it('does not start an identifier with a digit', () => {
      expect(cssVarName('7-up-green')).toBe('c-7-up-green')
    })

    it('leaves the data slug alone — it is a key, not a CSS name', () => {
      const hays = real.data.colors.find((c) => c.slug.includes("'"))
      expect(hays, 'expected at least one apostrophe slug in the book').toBeTruthy()
      expect(hays!.slug).toContain("'")
      expect(JSON.parse(jsonFor(real, real.data.combinations[0])).colors[0].slug)
        .toBe(real.colorById.get(real.data.combinations[0].colorIds[0])!.slug)
    })
  })

  it('formats JSON with names and codes', () => {
    const parsed = JSON.parse(jsonFor(ix, combo))
    expect(parsed.combination).toBe(10)
    expect(parsed.colors).toEqual([
      { name: 'Test Pink A', slug: 'test-pink-a', hex: '#ffa6d9', rgb: [255, 166, 217], cmyk: [0, 35, 15, 0] },
      { name: 'Test Blue A', slug: 'test-blue-a', hex: '#236192', rgb: [35, 97, 146], cmyk: [76, 34, 0, 43] },
    ])
  })
})
