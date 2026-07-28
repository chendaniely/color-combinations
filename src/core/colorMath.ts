// Pure color math. Core kernel: no imports outside src/core.

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

// Parse a user-entered hex color into RGB, or null if it isn't a valid 3- or
// 6-digit hex. Accepts an optional leading '#', any case, surrounding
// whitespace; expands 3-digit shorthand. Pure — no browser globals.
export function parseHex(input: string): RGB | null {
  const h = input.trim().replace(/^#/, '').toLowerCase()
  if (!/^[0-9a-f]{3}$/.test(h) && !/^[0-9a-f]{6}$/.test(h)) return null
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

export function rgbToHsl([r, g, b]: RGB): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = 60 * (((gn - bn) / d) % 6)
  else if (max === gn) h = 60 * ((bn - rn) / d + 2)
  else h = 60 * ((rn - gn) / d + 4)
  if (h < 0) h += 360
  return { h, s, l }
}

export function hueOf(hex: string): number {
  return rgbToHsl(hexToRgb(hex)).h
}

const NEUTRAL_SATURATION = 0.14

export function isNeutral(hex: string): boolean {
  return rgbToHsl(hexToRgb(hex)).s < NEUTRAL_SATURATION
}

export function readableTextOn(hex: string): 'dark' | 'light' {
  const [r, g, b] = hexToRgb(hex)
  // Perceived luminance (ITU-R BT.601)
  const luma = 0.299 * r + 0.587 * g + 0.114 * b
  return luma > 150 ? 'dark' : 'light'
}

export type HSV = { h: number; s: number; v: number }

// Hue-saturation-value. Hue is undefined for grays and reported as 0 — callers
// that need to preserve a user's hue through a gray must hold HSV themselves
// rather than round-tripping through RGB.
export function rgbToHsv([r, g, b]: RGB): HSV {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / d + 2)
    else h = 60 * ((rn - gn) / d + 4)
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const c = v * s
  const hp = ((((h % 360) + 360) % 360)) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let base: [number, number, number]
  if (hp < 1) base = [c, x, 0]
  else if (hp < 2) base = [x, c, 0]
  else if (hp < 3) base = [0, c, x]
  else if (hp < 4) base = [0, x, c]
  else if (hp < 5) base = [x, 0, c]
  else base = [c, 0, x]
  const m = v - c
  return base.map((n) => Math.round((n + m) * 255)) as RGB
}

export type CMYK = [number, number, number, number]

// Plain (uncalibrated) CMYK. This is not an approximation for this dataset —
// it is the exact convention the book's own stored CMYK values use, so a typed
// CMYK lands dead-on a book color. Not color management; see the spec.
export function rgbToCmyk([r, g, b]: RGB): CMYK {
  const k = 1 - Math.max(r, g, b) / 255
  if (k === 1) return [0, 0, 0, 100]
  return [
    (1 - r / 255 - k) / (1 - k),
    (1 - g / 255 - k) / (1 - k),
    (1 - b / 255 - k) / (1 - k),
    k,
  ].map((n) => Math.round(n * 100)) as CMYK
}

export function cmykToRgb([c, m, y, k]: CMYK): RGB {
  const kf = 1 - k / 100
  return [(1 - c / 100) * kf, (1 - m / 100) * kf, (1 - y / 100) * kf]
    .map((n) => Math.round(n * 255)) as RGB
}
