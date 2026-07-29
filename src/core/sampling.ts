// Average an ImageData-style RGBA buffer over a small square patch, clamped to
// the image. Pure (no browser globals) so the sampling math is unit-tested;
// the camera component only reads pixels and calls this. Core kernel.
import type { RGB } from './colorMath'

export function averagePatch(
  data: Uint8ClampedArray, width: number, height: number,
  cx: number, cy: number, radius: number,
): RGB {
  if (width <= 0 || height <= 0) return [0, 0, 0]
  // Clamp the CENTRE into the image before deriving the patch. Without this an
  // out-of-bounds tap — which an object-fit: cover crop can produce at the
  // edges — gave x0 > x1, so the loop never ran, n stayed 0 and the function
  // returned black. The caller then matched the visitor's tap to whatever book
  // colour is nearest to black. Clamping samples the nearest real pixels
  // instead, which is what someone tapping at the edge meant.
  const ccx = Math.min(width - 1, Math.max(0, Math.floor(cx)))
  const ccy = Math.min(height - 1, Math.max(0, Math.floor(cy)))
  const x0 = Math.max(0, ccx - radius)
  const x1 = Math.min(width - 1, ccx + radius)
  const y0 = Math.max(0, ccy - radius)
  const y1 = Math.min(height - 1, ccy + radius)
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
