// Formats a combination for use outside the site (CSS, JSON).
// Core kernel: no imports outside src/core.
import type { Indexed } from './dataset'
import type { CombinationRecord } from './types'

export function cssVariablesFor(ix: Indexed, combo: CombinationRecord): string {
  const colors = combo.colorIds.map((id) => ix.colorById.get(id)!)
  const names = colors.map((c) => c.name).join(', ')
  const lines = colors.map((c) => `  --${c.slug}: ${c.hex};`).join('\n')
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
