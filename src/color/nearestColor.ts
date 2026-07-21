// Rank book colors by perceptual distance to a sampled RGB. Depends on the
// colorDistance SEAM, never on the metric directly. In src/color (imports core types).
import { colorDistance } from './colorDistance'
import type { RGB } from '../core/colorMath'
import type { Indexed } from '../core/dataset'
import type { ColorRecord } from '../core/types'

export interface NearMatch { color: ColorRecord; distance: number }

export function nearestColors(ix: Indexed, rgb: RGB, count: number): NearMatch[] {
  return ix.data.colors
    .map((color) => ({ color, distance: colorDistance(rgb, color.rgb) }))
    .sort((a, b) => a.distance - b.distance || a.color.id - b.color.id)
    .slice(0, count)
}
