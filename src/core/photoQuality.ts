// Cheap honesty checks on the samples we have already taken.
// Core kernel: no imports outside src/core.
//
// The problem this solves: a badly lit photo produced a reading that LOOKED
// exactly as confident as a good one. The only signal was the "rough reading"
// badge, which fires solely when no white reference was found. The owner's
// first real use ended with "i think my camera and lightening isn't great" --
// the app had said nothing.
//
// Everything here works on plain RGB so it can live in the pure kernel. The
// thresholds are dials, in the same sense as the axis constants in
// skinMetrics.ts: chosen to be obviously-bad rather than marginal, because a
// warning that cries wolf on an acceptable photo is worse than no warning.
import type { RGB } from './colorMath'

export type QualityWarning = 'dark' | 'blownOut' | 'unevenLight'

// ITU-R BT.601 perceived luminance, 0..255.
function luma([r, g, b]: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function distance(a: RGB, b: RGB): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

// Deliberately dark: skin this dim carries too little signal to separate
// undertone from shadow. Mid-tone skin sits well above this even indoors.
const DARK_LUMA = 55
// Near the ceiling, where highlights clip and hue information is destroyed.
const BRIGHT_LUMA = 242
// A channel pinned at the top means the sensor ran out of range; the true
// colour is unknowable, not merely bright.
const CLIPPED = 252
// Across forehead, both cheeks and jaw, natural variation is real but modest.
// Beyond this the face is lit from one side, and whichever probes sit in the
// shadow drag the reading with them.
const SPREAD = 72

export function photoWarnings(skinSamples: readonly RGB[]): QualityWarning[] {
  if (skinSamples.length === 0) return []
  const out: QualityWarning[] = []
  const lumas = skinSamples.map(luma)
  const mean = lumas.reduce((a, b) => a + b, 0) / lumas.length

  if (mean < DARK_LUMA) out.push('dark')

  // Either the whole patch is at the ceiling, or half the samples have a
  // channel hard against it.
  const clipped = skinSamples.filter((s) => s.some((c) => c >= CLIPPED)).length
  if (mean > BRIGHT_LUMA || clipped * 2 >= skinSamples.length) out.push('blownOut')

  let worst = 0
  for (let i = 0; i < skinSamples.length; i++) {
    for (let j = i + 1; j < skinSamples.length; j++) {
      worst = Math.max(worst, distance(skinSamples[i], skinSamples[j]))
    }
  }
  if (worst > SPREAD) out.push('unevenLight')

  return out
}

// One sentence per warning, in the second person, saying what to do about it.
// A warning the visitor cannot act on is just an apology.
export const WARNING_TEXT: Record<QualityWarning, string> = {
  dark: 'This photo is quite dark, so the colours we read are less certain. More light — a window, or facing a lamp — will give a truer reading.',
  blownOut: 'This photo is very bright and some of it has washed out, which hides your real colouring. Try moving out of direct light.',
  unevenLight: 'The light is falling unevenly across your face, so the two sides disagree. Turning to face the light more squarely will help.',
}
