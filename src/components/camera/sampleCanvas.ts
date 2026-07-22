// Shared canvas eyedrop: map a pointer tap on a cover-fit canvas back to a
// source pixel and average a small patch. Used by the live camera and the
// image-upload picker. Reads getImageData locally (allowed by the camera
// privacy test) — never a network/storage API.
import type { RGB } from '../../core/colorMath'
import { averagePatch } from '../../core/sampling'

export const PATCH_RADIUS = 6

export function sampleCanvasAt(
  canvas: HTMLCanvasElement, clientX: number, clientY: number, radius = PATCH_RADIUS,
): RGB | null {
  const ctx = canvas.getContext('2d')
  if (!ctx || !canvas.width || !canvas.height) return null
  const rect = canvas.getBoundingClientRect()
  // canvas.width/height are the source pixels; rect is the displayed box. The
  // element is object-fit: cover, so invert the uniform cover scale + centered
  // crop to map a tap to a source pixel (NOT an independent x/y stretch = fill).
  const k = Math.max(rect.width / canvas.width, rect.height / canvas.height)
  const cx = (clientX - rect.left - rect.width / 2) / k + canvas.width / 2
  const cy = (clientY - rect.top - rect.height / 2) / k + canvas.height / 2
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return averagePatch(img.data, canvas.width, canvas.height, cx, cy, radius)
}
