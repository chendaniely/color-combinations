// The color-difference SEAM — the ONLY place that decides how far apart two
// colors are. Default: Euclidean distance in OKLab (culori). Swap to
// differenceCiede2000() etc. here and nothing downstream changes: nearestColor
// and the UI depend on these signatures, not on the metric. Lives in src/color
// (not the pure core kernel) because it imports culori.
import { differenceEuclidean } from 'culori'
import type { RGB } from '../core/colorMath'

const oklabDistance = differenceEuclidean('oklab')

// culori works in 0..1 channels; our RGB is 0..255.
function culoriRgb([r, g, b]: RGB) {
  return { mode: 'rgb' as const, r: r / 255, g: g / 255, b: b / 255 }
}

export function colorDistance(a: RGB, b: RGB): number {
  return oklabDistance(culoriRgb(a), culoriRgb(b))
}

const VERY_CLOSE = 0.05
const CLOSE = 0.10

export function closenessLabel(distance: number): 'very close' | 'close' | 'roughly' {
  if (distance <= VERY_CLOSE) return 'very close'
  if (distance <= CLOSE) return 'close'
  return 'roughly'
}
