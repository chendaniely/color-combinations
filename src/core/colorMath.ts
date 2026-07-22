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
