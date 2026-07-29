// Formats a combination for use outside the site (CSS, JSON).
// Core kernel: no imports outside src/core.
import type { Indexed } from './dataset'
import type { CombinationRecord } from './types'

// A slug is a stable data key; a CSS custom property name is an IDENTIFIER, and
// the two are not the same thing. Five of the book's colours carry punctuation
// that a slug happily keeps and CSS rejects: "Hay's Russet", "Pale King's Blue"
// and "Vandar Poel's Blue" keep an apostrophe, and "Eugenia Red | A" and "| B"
// keep a pipe. Emitted raw, they produced `--hay's-russet: #a35d4a;` — invalid
// CSS that a browser drops on the floor.
//
// That was 28 of the 338 combinations, roughly one in twelve, silently handing
// visitors a broken stylesheet from the Copy CSS button.
//
// The data slug is deliberately NOT changed: it is a key used elsewhere, and
// renaming it to suit one output format would be the tail wagging the dog.
// Verified across all 157 colours that this mapping collides for none of them.
export function cssVarName(slug: string): string {
  const cleaned = slug
    .toLowerCase()
    // Apostrophes are dropped, not replaced: they sit INSIDE a word, so
    // "hay's" should read "hays", not "hay-s". Anything else invalid is a
    // separator in the original name — the pipe in "Eugenia Red | A" — and
    // becomes a hyphen.
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  // A CSS ident may not begin with a digit; prefix rather than drop, so two
  // colours differing only in a leading number stay distinct.
  return /^[0-9]/.test(cleaned) ? `c-${cleaned}` : cleaned
}

export function cssVariablesFor(ix: Indexed, combo: CombinationRecord): string {
  const colors = combo.colorIds.map((id) => ix.colorById.get(id)!)
  const names = colors.map((c) => c.name).join(', ')
  const lines = colors.map((c) => `  --${cssVarName(c.slug)}: ${c.hex};`).join('\n')
  return `/* Sanzo Wada combination ${combo.id} — ${names} */\n:root {\n${lines}\n}\n`
}

export function jsonFor(ix: Indexed, combo: CombinationRecord): string {
  const colors = combo.colorIds.map((id) => {
    const c = ix.colorById.get(id)!
    return { name: c.name, slug: c.slug, hex: c.hex, rgb: c.rgb, cmyk: c.cmyk }
  })
  return JSON.stringify(
    { combination: combo.id, source: 'A Dictionary of Color Combinations — Sanzo Wada', colors },
    null, 2,
  )
}
