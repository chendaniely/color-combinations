// Average an ImageData-style RGBA buffer over a small square patch, clamped to
// the image. Pure (no browser globals) so the sampling math is unit-tested;
// the camera component only reads pixels and calls this. Core kernel.
import type { RGB } from './colorMath'

export function averagePatch(
  data: Uint8ClampedArray, width: number, height: number,
  cx: number, cy: number, radius: number,
): RGB {
  const x0 = Math.max(0, Math.floor(cx) - radius)
  const x1 = Math.min(width - 1, Math.floor(cx) + radius)
  const y0 = Math.max(0, Math.floor(cy) - radius)
  const y1 = Math.min(height - 1, Math.floor(cy) + radius)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
    }
  }
  if (n === 0) return [0, 0, 0]
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}
