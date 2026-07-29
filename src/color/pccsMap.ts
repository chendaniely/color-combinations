// Lab <-> PCCS. THE modelling judgement in the season system.
//
// Everything else in the PCCS datasets is transcribed from a published source.
// This file is not, and cannot be: PCCS was defined in 1964 on physical paper
// chips measured under illuminant C, and Wada's colours reach us as sRGB hex
// on a screen. Nothing published maps one onto the other, so we choose a
// mapping and write down what we chose. Three decisions, each defensible and
// each arguable:
//
// 1. LIGHTNESS. PCCS lightness is Munsell value, and Munsell value tracks
//    CIE L* closely enough that V ~ L*/10 is the standard working
//    approximation. Clamped into the published 1.5-9.5 range, so black and
//    white land on the endpoints of the scale rather than off it.
//
// 2. SATURATION. PCCS saturation is NOT raw chroma. 9s means "the pure colour"
//    — the most saturated version available at that lightness and hue. So we
//    normalise: saturation = 9 * C / maxChroma(L, h). Without this a pale pink
//    could never read as anything but dull, and the Pale and Light tones would
//    be unreachable — which would quietly empty out half the seasons.
//
// 3. HUE. The PCCS circle is spaced PERCEPTUALLY, not evenly in Lab, and the
//    difference is not small. Even spacing was tried first and put yellow on
//    step 6 instead of the published step 8: the red-to-yellow arc spans six
//    PCCS steps but only ~63 degrees of Lab, while the blue region is stretched
//    the other way. So instead we anchor on the four psychological primaries
//    the circle is actually built from — red 2, yellow 8, green 12, blue 17 —
//    and interpolate linearly between them.
//
//    Caveat worth knowing: PCCS's primaries are the UNIQUE hues (the red that
//    looks neither orange nor purple, and so on), which the sRGB primaries
//    only approximate. Using sRGB gives a mapping anyone can recompute from
//    this file alone, with no further source needed, at the cost of some
//    accuracy in the blue-green region. That is the trade we chose.
//
// Lives in src/color/ because it imports culori. src/core/ stays pure.
import { converter, formatHex, inGamut } from 'culori'
import { LIGHTNESS_MAX, LIGHTNESS_MIN, SATURATION_MAX, toneAt, type PccsTone } from '../core/pccs'

const toLab = converter('lab')
const toRgb = converter('rgb')
const rgbInGamut = inGamut('rgb')

function labAngle(hex: string): number {
  const { a, b } = toLab(hex)
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
}

/**
 * The four psychological primaries the PCCS circle is built from, paired with
 * the sRGB colour we use to stand in for each. Angles are UNWRAPPED — strictly
 * increasing around one full turn — so interpolation between them is plain
 * arithmetic with no special case at the 360/0 seam.
 */
const ANCHORS: { step: number; angle: number }[] = (() => {
  const raw = [
    { step: 2, hex: '#ff0000' }, // R  — red
    { step: 8, hex: '#ffff00' }, // Y  — yellow
    { step: 12, hex: '#00ff00' }, // G  — green
    { step: 17, hex: '#0000ff' }, // B  — blue
  ].map((a) => ({ step: a.step, angle: labAngle(a.hex) }))

  const unwrapped: { step: number; angle: number }[] = [raw[0]]
  for (const a of raw.slice(1)) {
    const prev = unwrapped[unwrapped.length - 1].angle
    let angle = a.angle
    while (angle < prev) angle += 360
    unwrapped.push({ step: a.step, angle })
  }
  // Close the circle: red again, one full turn on.
  unwrapped.push({ step: raw[0].step + 24, angle: unwrapped[0].angle + 360 })
  return unwrapped
})()

/** Unwrapped angle for a step, interpolating between the psychological primaries. */
function unwrappedAngle(n: number): number {
  const step = n < ANCHORS[0].step ? n + 24 : n
  for (let i = 1; i < ANCHORS.length; i++) {
    const lo = ANCHORS[i - 1]
    const hi = ANCHORS[i]
    if (step <= hi.step) {
      const t = (step - lo.step) / (hi.step - lo.step)
      return lo.angle + t * (hi.angle - lo.angle)
    }
  }
  return ANCHORS[ANCHORS.length - 1].angle
}

/** Every step's unwrapped angle, precomputed — the inverse search needs them all. */
const STEP_ANGLES: number[] = Array.from({ length: 24 }, (_, i) => unwrappedAngle(i + 1))

export interface PccsCoords {
  /** 1.5-9.5, the PCCS lightness scale. */
  lightness: number
  /** 0-9, chroma relative to the gamut maximum at this lightness and hue. */
  saturation: number
  /** Lab hue angle in degrees, 0-360. Kept raw so callers can round as they need. */
  hueAngle: number
  /** 1-24, the nearest step of the PCCS hue circle. */
  hue: number
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** Lab hue angle for a step of the PCCS circle. */
export function hueAngle(n: number): number {
  const wrapped = (((n - 1) % 24) + 24) % 24 + 1
  return ((STEP_ANGLES[wrapped - 1] % 360) + 360) % 360
}

/** Nearest step of the PCCS circle to a Lab hue angle. Wraps. */
export function hueNumber(angle: number): number {
  const a = ((angle % 360) + 360) % 360
  let best = 1
  let bestGap = Infinity
  for (let n = 1; n <= 24; n++) {
    const target = hueAngle(n)
    // Compare the short way round, so 359 and 1 are two degrees apart.
    const raw = Math.abs(a - target) % 360
    const gap = Math.min(raw, 360 - raw)
    if (gap < bestGap) {
      bestGap = gap
      best = n
    }
  }
  return best
}

/**
 * Largest Lab chroma that is still inside sRGB at this lightness and hue.
 * Binary search, because the gamut boundary has no closed form — its shape in
 * Lab is the reason a vivid yellow and a vivid blue sit at such different
 * chromas.
 */
export function maxChroma(L: number, hDeg: number): number {
  const rad = (hDeg * Math.PI) / 180
  let lo = 0
  let hi = 160 // beyond any sRGB chroma; the search pulls it down fast
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const candidate = {
      mode: 'lab' as const,
      l: L,
      a: Math.cos(rad) * mid,
      b: Math.sin(rad) * mid,
    }
    if (rgbInGamut(candidate)) lo = mid
    else hi = mid
  }
  return lo
}

/** Where a colour sits in PCCS coordinates. */
export function labToPccs(hex: string): PccsCoords {
  const { l, a, b } = toLab(hex)
  const chroma = Math.hypot(a, b)
  const angle = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
  const ceiling = maxChroma(l, angle)
  return {
    lightness: clamp(l / 10, LIGHTNESS_MIN, LIGHTNESS_MAX),
    // Guard the divide: at the extremes of lightness the gamut pinches to
    // nothing, and 0/0 would otherwise come back NaN and poison every
    // downstream comparison silently.
    saturation: ceiling < 1e-6 ? 0 : clamp((SATURATION_MAX * chroma) / ceiling, 0, SATURATION_MAX),
    hueAngle: angle,
    hue: hueNumber(angle),
  }
}

/** The colour at a point in PCCS coordinates, as sRGB hex. */
export function pccsToHex(hue: number, lightness: number, saturation: number): string {
  const L = clamp(lightness, LIGHTNESS_MIN, LIGHTNESS_MAX) * 10
  const angle = hueAngle(hue)
  const rad = (angle * Math.PI) / 180
  const chroma = (clamp(saturation, 0, SATURATION_MAX) / SATURATION_MAX) * maxChroma(L, angle)
  return formatHex(
    toRgb({ mode: 'lab', l: L, a: Math.cos(rad) * chroma, b: Math.sin(rad) * chroma }),
  )
}

/** The PCCS tone a colour belongs to, or null if it sits on the grey axis. */
export function toneOf(tones: PccsTone[], hex: string): string | null {
  const { lightness, saturation } = labToPccs(hex)
  return toneAt(tones, lightness, saturation)?.abbr ?? null
}
