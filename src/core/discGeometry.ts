// Pure geometry for the color picker's hue/saturation disc. Kept out of the
// component because jsdom has no layout — as plain functions taking an explicit
// radius, this is fully unit-testable.
// Core kernel: no imports outside src/core.

// dx/dy are pixels from the disc center, y growing downward (screen coords).
// Hue 0 is straight up and increases clockwise, matching the CSS
// `conic-gradient(from 0deg, …)` that paints the disc.
export function discPointToHueSat(dx: number, dy: number, radius: number): { h: number; s: number } {
  if (radius <= 0) return { h: 0, s: 0 }
  let h = (Math.atan2(dy, dx) * 180) / Math.PI + 90
  if (h < 0) h += 360
  if (h >= 360) h -= 360
  return { h, s: Math.min(Math.hypot(dx, dy), radius) / radius }
}

export function hueSatToDiscPoint(h: number, s: number, radius: number): { dx: number; dy: number } {
  const angle = ((h - 90) * Math.PI) / 180
  const r = Math.max(0, Math.min(1, s)) * radius
  return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r }
}
