// Renders a combination plate to a PNG download. Browser-only by design.
import type { Indexed } from './core/dataset'
import type { CombinationRecord } from './core/types'
import { barWeights } from './plateLayout'

const W = 1200
const H = 900
const BARS_H = 640
/** Text starts here and the bars end at W - MARGIN, so captions share their edge. */
const MARGIN = 80

/**
 * Reads a design token at run time.
 *
 * The canvas cannot use `var(--ink)`, so this file used to hardcode the hex
 * values — and they went stale. v1.6.0 re-solved the three ink tokens for WCAG
 * AA contrast and moved `--ink-muted` from `#7e7468` to `#554c41`; this file
 * kept the old one. Every PNG the site has ever exported carries caption text
 * at 4.24:1, under the 4.50 AA needs, on the one artefact people actually
 * share and print.
 *
 * Reading the token instead of copying it means that cannot recur: there is now
 * one source of truth, which is what the no-hard-coded-colours rule is for.
 */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function downloadPlatePng(ix: Indexed, combo: CombinationRecord): void {
  const colors = combo.colorIds.map((id) => ix.colorById.get(id)!)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = token('--paper-1', '#f8f6f2')
  ctx.fillRect(0, 0, W, H)

  const weights = barWeights(colors.length)
  let y = MARGIN
  colors.forEach((c, i) => {
    const h = weights[i] * BARS_H
    ctx.fillStyle = c.hex
    ctx.fillRect(MARGIN, y, W - MARGIN * 2, h)
    y += h
  })

  // Every caption is clamped to the width the bars occupy. fillText does not
  // wrap or clip, so before this a long enough name simply ran off the canvas
  // and was cropped out of the file — worst on the five-colour plates, whose
  // names total 60-odd characters. The maxWidth argument condenses instead,
  // which keeps the whole name readable and inside the plate.
  const maxWidth = W - MARGIN * 2
  ctx.fillStyle = token('--ink', '#2f2a26')
  ctx.font = '28px Georgia, serif'
  ctx.fillText(colors.map((c) => c.name).join(' · '), MARGIN, y + 56, maxWidth)
  ctx.fillStyle = token('--ink-muted', '#554c41')
  ctx.font = '22px Georgia, serif'
  ctx.fillText(
    `No. ${combo.id} — A Dictionary of Color Combinations, Sanzo Wada`,
    MARGIN, y + 96, maxWidth,
  )
  ctx.fillText(colors.map((c) => c.hex).join('   '), MARGIN, y + 132, maxWidth)

  canvas.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sanzo-wada-${combo.id}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  })
}
