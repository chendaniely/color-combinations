// Turn sampled pixels into the three axes the palettes are built from.
// Lives in src/color (not the pure core kernel) because it uses culori for
// Lab — the project rule is not to hand-roll colour science.
import { converter } from 'culori'
import type { RGB } from '../core/colorMath'
import type { ContrastBand, Depth, SkinReading, Undertone } from '../core/types'
import { colorDistance } from './colorDistance'
import { whiteBalance } from './whiteBalance'

const toLab = converter('lab')

// Constants from the spec. Every one is a dial.
const WARM_ABOVE = 55
const COOL_BELOW = 48
const LIGHT_ABOVE = 70
const DEEP_BELOW = 50
const CONTRAST_HIGH = 40
const CONTRAST_LOW = 22

// If the "hair" sample is this close to the skin sample, the probe landed on
// skin — a fringe, a receding hairline, a bald head — and the contrast axis
// would be built on comparing skin with itself.
//
// The number is the colour-distance seam's own definition of "very close"
// (VERY_CLOSE in colorDistance.ts), not a new invention. It is deliberately
// FAR below the low-contrast boundary: CONTRAST_LOW = 22 in Lab ΔL is roughly
// 0.15 in OKLab, so someone whose hair and skin genuinely are similar — the
// people the "low contrast" reading exists to describe — keeps their real
// reading. This only fires when the two samples are effectively one surface.
const SAME_SURFACE = 0.05

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')
}

function lab([r, g, b]: RGB) {
  return toLab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 })
}

export function labOf(rgb: RGB): { L: number; C: number; h: number } {
  const { l, a, b } = lab(rgb)
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
  return { L: l, C: Math.hypot(a, b), h }
}

function undertoneOf(hue: number): Undertone {
  if (hue > WARM_ABOVE) return 'warm'
  if (hue < COOL_BELOW) return 'cool'
  return 'neutral'
}

function depthOf(L: number): Depth {
  if (L > LIGHT_ABOVE) return 'light'
  if (L < DEEP_BELOW) return 'deep'
  return 'medium'
}

function contrastOf(gap: number | null, skinL: number): ContrastBand {
  // With no hair to compare against, fall back to how far the skin itself sits
  // from mid-grey. Weaker, and the page says so.
  const g = gap ?? Math.abs(skinL - 50)
  if (g > CONTRAST_HIGH) return 'high'
  if (g < CONTRAST_LOW) return 'low'
  return 'medium'
}

// True when a hair sample is indistinguishable from the skin sample, i.e. the
// probe never found hair at all. Exported so the capture UI can say so before
// the visitor commits, rather than only the reading being quietly weakened.
export function hairIsActuallySkin(skin: RGB, hair: RGB | null): boolean {
  return hair !== null && colorDistance(skin, hair) < SAME_SURFACE
}

export function readSkin(skin: RGB, hair: RGB | null, whiteRef: RGB | null): SkinReading {
  // Drop a hair sample that is really skin. Left in, it produced a confident
  // contrast reading from comparing the face with itself — always a tiny gap,
  // so always "low contrast", for anyone whose hair the probe happened to miss.
  const usableHair = hairIsActuallySkin(skin, hair) ? null : hair

  const balancedSkin = whiteBalance(skin, whiteRef)
  const balancedHair = usableHair ? whiteBalance(usableHair, whiteRef) : null

  const s = labOf(balancedSkin)
  const hairL = balancedHair ? labOf(balancedHair).L : null
  const gap = hairL === null ? null : Math.abs(s.L - hairL)

  // ITA° — Chardon et al. 1991, the standard dermatological depth measure.
  const ita = (Math.atan2(s.L - 50, lab(balancedSkin).b) * 180) / Math.PI

  return {
    skin: toHex(balancedSkin),
    hair: balancedHair ? toHex(balancedHair) : null,
    undertone: undertoneOf(s.h),
    depth: depthOf(s.L),
    contrast: contrastOf(gap, s.L),
    skinL: Math.round(s.L * 10) / 10,
    skinHue: Math.round(s.h * 10) / 10,
    ita: Math.round(ita * 10) / 10,
    contrastGap: gap === null ? null : Math.round(gap * 10) / 10,
    whiteBalanced: whiteRef !== null,
  }
}
