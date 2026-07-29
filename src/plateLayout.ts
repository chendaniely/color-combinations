// Shared plate geometry. Browser-side presentation, not core: the taper is a
// decorative choice, NOT data from the book — the source has no area
// proportions (see TODO: "Research the book's true plate area ratios").
//
// This lives in one place because two renderers must agree pixel-for-pixel:
// PlateCard draws the on-screen plate with flex-grow, and exportPng draws the
// same plate to a canvas for download. When they drifted apart, a downloaded
// PNG would not match the plate the visitor clicked.

export const TAPER = [1.5, 1.15, 0.9, 0.75, 0.7]

// Fractions of the total height, one per colour, largest first.
// Always sums to 1, so callers can multiply by whatever height they render at.
export function barWeights(count: number): number[] {
  const weights = TAPER.slice(0, count)
  const total = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => w / total)
}
