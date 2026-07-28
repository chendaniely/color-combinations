// Find something white to balance against. Pure — no browser, no colour
// library: "near-neutral and bright" is decided in plain RGB so this stays in
// the kernel. Core kernel: no imports outside src/core.
import type { RGB } from './colorMath'
import { robustColor, samplesInPatch } from './robustSample'
import type { FaceBox } from './types'

const GRID = 16          // probes across the frame's shorter side
const PATCH = 4          // patch radius in pixels
const MAX_SPREAD = 18    // max(channel) - min(channel): the chroma ceiling
const MIN_LEVEL = 110    // below this it is shadow, not a lit white
const CLIP = 255         // any channel at 255 means the highlight is blown

function inside(box: FaceBox, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
}

export function findWhiteRef(
  data: Uint8ClampedArray, width: number, height: number, exclude: FaceBox | null,
): { cx: number; cy: number; rgb: RGB } | null {
  const step = Math.max(1, Math.floor(Math.min(width, height) / GRID))
  let best: { cx: number; cy: number; rgb: RGB } | null = null

  for (let cy = step; cy < height - step; cy += step) {
    for (let cx = step; cx < width - step; cx += step) {
      if (exclude && inside(exclude, cx, cy)) continue
      const rgb = robustColor(samplesInPatch(data, width, height, cx, cy, PATCH))
      if (!rgb) continue
      const [r, g, b] = rgb
      const hi = Math.max(r, g, b)
      const lo = Math.min(r, g, b)
      if (hi >= CLIP) continue                 // blown out — carries no colour
      if (hi - lo > MAX_SPREAD) continue       // too saturated to be white
      if (hi < MIN_LEVEL) continue             // too dark to be a lit white
      if (!best || hi > Math.max(...best.rgb)) best = { cx, cy, rgb }
    }
  }
  return best
}
