// Prints all 157 colors as ANSI swatches sorted by hue — an aid for hand-
// curating the grouping hierarchy. Run: npx tsx scripts/ingest/preview-hues.ts
import { readFileSync } from 'node:fs'
import { hexToRgb, hueOf, isNeutral, rgbToHsl } from '../../src/core/colorMath'
import type { RawFile } from './rawTypes'

const raw = JSON.parse(readFileSync('data/raw/colors.json', 'utf8')) as RawFile

const rows = raw.colors
  .map((c) => ({ ...c, hue: hueOf(c.hex), neutral: isNeutral(c.hex), l: rgbToHsl(hexToRgb(c.hex)).l }))
  .sort((a, b) => Number(a.neutral) - Number(b.neutral) || a.hue - b.hue || a.l - b.l)

for (const c of rows) {
  const [r, g, b] = hexToRgb(c.hex)
  const block = `\x1b[48;2;${r};${g};${b}m        \x1b[0m`
  const tag = c.neutral ? 'NEUTRAL' : `h${c.hue.toFixed(0).padStart(3)}`
  console.log(`${block} ${tag} l${c.l.toFixed(2)} ${c.slug} (${c.name})`)
}
