// White balance: the correction, and the two-axis control that drives it.
//
// Lives in src/color (not the pure core kernel) because it is colour science.
// It uses no library — sRGB transfer and von Kries scaling are short enough to
// write exactly, and culori has no white-balance primitive to defer to.
import type { RGB } from '../core/colorMath'

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

// sRGB is gamma-encoded; an illuminant multiplies LINEAR light. Correcting has
// to happen in linear space or the power curve distorts the correction.
//
// This is measured, not assumed. Scaling the gamma-encoded values directly is
// close enough under mild casts (mean dE 0.41) but breaks down under strong
// ones — worst dE 3.02, above the perceptible threshold, and it flipped the
// undertone verdict on 3 of 48 simulated cast/skin pairs. In linear light:
// worst dE 0.95, one flip, and that one sits 2 degrees from the warm/cool
// boundary where any residual would tip it.
export function srgbToLinear(v: number): number {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function linearToSrgb(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
  return clamp255(c * 255)
}

// The per-channel gains that make the reference read as neutral.
export function channelGains(whiteRef: RGB): [number, number, number] {
  const refLinear = whiteRef.map(srgbToLinear)
  const peak = Math.max(...refLinear)
  return refLinear.map((v) => peak / Math.max(1e-6, v)) as [number, number, number]
}

// Von Kries-style: scale each channel so the reference would read as neutral.
// Simpler than a full chromatic-adaptation transform (Bradford/CAT02), but it
// is the correction the visitor consented to by holding up a white object, and
// the residual error is far below what anyone can see.
export function whiteBalance(rgb: RGB, whiteRef: RGB | null): RGB {
  if (!whiteRef) return rgb
  const gains = channelGains(whiteRef)
  return rgb.map((v, i) => linearToSrgb(srgbToLinear(v) * gains[i])) as RGB
}

// The same correction as a per-channel lookup table, for applying to a whole
// image. The correction depends only on a channel's own value, so 3x256
// precomputed entries give exactly the same answer as whiteBalance() while
// replacing ~4 million Math.pow calls on a 1200px photo with array lookups.
export function whiteBalanceTable(whiteRef: RGB): Uint8ClampedArray[] {
  const gains = channelGains(whiteRef)
  return gains.map((gain) => {
    const table = new Uint8ClampedArray(256)
    for (let v = 0; v < 256; v++) table[v] = linearToSrgb(srgbToLinear(v) * gain)
    return table
  })
}

// ---------------------------------------------------------------------------
// The two-axis control, so the reference can be nudged by hand as well as
// eyedropped — the pairing every photo editor uses, because one tap on a white
// object is a guess you then want to refine.
//
//   temp  blue <-> amber   (positive = warmer image)
//   tint  green <-> magenta (positive = more magenta)
//
// Both are log-ratios of the reference's linear channels, which makes the axes
// independent and the mapping exactly invertible: eyedropping sets the sliders,
// and moving the sliders produces a reference the eyedropper could have found.
// ---------------------------------------------------------------------------

export interface WhiteBalanceControls { temp: number; tint: number }

export const NEUTRAL: WhiteBalanceControls = { temp: 0, tint: 0 }

// exp(0.8) is about a 2.2x channel ratio — beyond any real indoor cast.
export const CONTROL_LIMIT = 0.8

export function whiteRefToControls(whiteRef: RGB): WhiteBalanceControls {
  // Guard against a log of zero on a fully clipped-black channel.
  const [r, g, b] = whiteRef.map((v) => Math.log(Math.max(1e-4, srgbToLinear(v))))
  return {
    temp: (b - r) / 2,
    tint: g - (r + b) / 2,
  }
}

export function controlsToWhiteRef({ temp, tint }: WhiteBalanceControls): RGB {
  // Inverse of the above under the gauge ln r + ln g + ln b = 0. Only the
  // ratios matter to channelGains, so the overall level is free; we rescale to
  // put the brightest channel at 1.0 before encoding.
  const lin = [
    Math.exp(-tint / 3 - temp),
    Math.exp((2 * tint) / 3),
    Math.exp(-tint / 3 + temp),
  ]
  const peak = Math.max(...lin)
  return lin.map((v) => linearToSrgb(v / peak)) as RGB
}
