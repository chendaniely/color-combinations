// Many pixel samples in, one trustworthy colour out. A stray eyebrow, shadow
// or specular highlight inside a probe must not move the reading, so we reject
// outliers before taking the median. Core kernel: no imports outside src/core.
import type { RGB } from './colorMath'

const DEFAULT_MAX_DISTANCE = 60

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export function medianColor(samples: RGB[]): RGB | null {
  if (samples.length === 0) return null
  return [
    median(samples.map((s) => s[0])),
    median(samples.map((s) => s[1])),
    median(samples.map((s) => s[2])),
  ]
}

export function rejectOutliers(samples: RGB[], maxDistance = DEFAULT_MAX_DISTANCE): RGB[] {
  const centre = medianColor(samples)
  if (!centre) return []
  const kept = samples.filter(([r, g, b]) =>
    Math.hypot(r - centre[0], g - centre[1], b - centre[2]) <= maxDistance)
  // Never return nothing: if the patch is genuinely bimodal, the median still
  // describes it better than an empty set does.
  return kept.length ? kept : samples
}

export function robustColor(samples: RGB[]): RGB | null {
  if (samples.length === 0) return null
  return medianColor(rejectOutliers(samples))
}

export function samplesInPatch(
  data: Uint8ClampedArray, width: number, height: number,
  cx: number, cy: number, radius: number,
): RGB[] {
  const x0 = Math.max(0, Math.floor(cx) - radius)
  const x1 = Math.min(width - 1, Math.floor(cx) + radius)
  const y0 = Math.max(0, Math.floor(cy) - radius)
  const y1 = Math.min(height - 1, Math.floor(cy) + radius)
  const out: RGB[] = []
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4
      out.push([data[i], data[i + 1], data[i + 2]])
    }
  }
  return out
}
