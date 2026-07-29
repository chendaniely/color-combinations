// Turn sampled pixels into the three axes the palettes are built from.
// Lives in src/color (not the pure core kernel) because it uses culori for
// Lab — the project rule is not to hand-roll colour science.
import { converter } from 'culori'
import type { RGB } from '../core/colorMath'
import type { ContrastBand, Depth, SkinReading, Undertone } from '../core/types'
import { whiteBalance } from './whiteBalance'

const toLab = converter('lab')

// Constants from the spec. Every one is a dial.
const WARM_ABOVE = 55
const COOL_BELOW = 48
const LIGHT_ABOVE = 70
const DEEP_BELOW = 50
const CONTRAST_HIGH = 40
const CONTRAST_LOW = 22

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

export function readSkin(skin: RGB, hair: RGB | null, whiteRef: RGB | null): SkinReading {
  const balancedSkin = whiteBalance(skin, whiteRef)
  const balancedHair = hair ? whiteBalance(hair, whiteRef) : null

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
