// The color-difference SEAM — the ONLY place that decides how far apart two
// colors are. Default: Euclidean distance in OKLab (culori). Swap to
// differenceCiede2000() etc. here and nothing downstream changes: nearestColor
// and the UI depend on these signatures, not on the metric. Lives in src/color
// (not the pure core kernel) because it imports culori.
import { differenceEuclidean } from 'culori'
import type { RGB } from '../core/colorMath'
import type { FitBand } from '../core/types'

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
// Only `fitBand` uses this one. The season palettes need a band beyond
// "roughly" because Wada's book genuinely has nothing near some seasons, and
// calling a 0.3 miss "roughly" would hide exactly the gap the season page
// exists to show.
const NOT_CLOSE = 0.25

export function closenessLabel(distance: number): 'very close' | 'close' | 'roughly' {
  if (distance <= VERY_CLOSE) return 'very close'
  if (distance <= CLOSE) return 'close'
  return 'roughly'
}

// Re-exported so callers of the seam get the band type from the seam, without
// the type itself living here — it is declared in the kernel so the pure
// join-table validator can name it too.
export type { FitBand }

/**
 * As `closenessLabel`, plus a fourth band for "the book has nothing like
 * this". Shares the thresholds above deliberately: two different notions of
 * "close" in one site would be a defect the moment they drifted.
 *
 * `closenessLabel` is left at three bands because its caller (the colour
 * sampler) always has a genuinely near match to show — the book covers the
 * whole hue circle well enough for that. A season is a much narrower target.
 */
export function fitBand(distance: number): FitBand {
  if (distance <= VERY_CLOSE) return 'very close'
  if (distance <= CLOSE) return 'close'
  if (distance <= NOT_CLOSE) return 'roughly'
  return 'not close'
}
