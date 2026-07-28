// Shared canvas eyedrop: map a pointer tap on a cover-fit canvas back to a
// source pixel and average a small patch. Used by the live camera and the
// image-upload picker. Reads getImageData locally (allowed by the camera
// privacy test) — never a network/storage API.
import type { RGB } from '../../core/colorMath'
import { averagePatch } from '../../core/sampling'

export const PATCH_RADIUS = 6

// How the canvas is laid out on screen. `cover` (the default) matches the
// camera and upload pickers; `contain` matches ProbeReview, which must show the
// whole frame so a white object at the edge stays visible and tappable.
export type CanvasFit = 'cover' | 'contain'

export function sampleCanvasAt(
  canvas: HTMLCanvasElement, clientX: number, clientY: number,
  radius = PATCH_RADIUS, fit: CanvasFit = 'cover',
): RGB | null {
  const ctx = canvas.getContext('2d')
  if (!ctx || !canvas.width || !canvas.height) return null
  const rect = canvas.getBoundingClientRect()
  // canvas.width/height are the source pixels; rect is the displayed box. Both
  // fits scale uniformly and centre the result, so inverting is the same
  // arithmetic with a different scale — max for cover, min for contain. (NOT an
  // independent x/y stretch, which would be `fill`.)
  const scale = fit === 'contain' ? Math.min : Math.max
  const k = scale(rect.width / canvas.width, rect.height / canvas.height)
  const cx = (clientX - rect.left - rect.width / 2) / k + canvas.width / 2
  const cy = (clientY - rect.top - rect.height / 2) / k + canvas.height / 2
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return averagePatch(img.data, canvas.width, canvas.height, cx, cy, radius)
}
