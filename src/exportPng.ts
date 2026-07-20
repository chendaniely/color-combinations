// Renders a combination plate to a PNG download. Browser-only by design.
import type { Indexed } from './core/dataset'
import type { CombinationRecord } from './core/types'

const W = 1200
const H = 900
const BARS_H = 640
const TAPER = [1.5, 1.15, 0.9, 0.75, 0.7]

export function downloadPlatePng(ix: Indexed, combo: CombinationRecord): void {
  const colors = combo.colorIds.map((id) => ix.colorById.get(id)!)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#f8f6f2'
  ctx.fillRect(0, 0, W, H)

  const weights = TAPER.slice(0, colors.length)
  const total = weights.reduce((a, b) => a + b, 0)
  let y = 80
  colors.forEach((c, i) => {
    const h = (weights[i] / total) * BARS_H
    ctx.fillStyle = c.hex
    ctx.fillRect(80, y, W - 160, h)
    y += h
  })

  ctx.fillStyle = '#2f2a26'
  ctx.font = '28px Georgia, serif'
  ctx.fillText(colors.map((c) => c.name).join(' · '), 80, y + 56)
  ctx.fillStyle = '#7e7468'
  ctx.font = '22px Georgia, serif'
  ctx.fillText(`No. ${combo.id} — A Dictionary of Color Combinations, Sanzo Wada`, 80, y + 96)
  ctx.fillText(colors.map((c) => c.hex).join('   '), 80, y + 132)

  canvas.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sanzo-wada-${combo.id}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  })
}
