// Where to sample a face. Pure geometry — proportions from the BlazeFace box
// and keypoints, no colour and no browser. Core kernel: no imports outside
// src/core.
import type { FaceGeometry, Point } from './types'

export type ProbeKind = 'forehead' | 'leftCheek' | 'rightCheek' | 'jaw' | 'hair'

export interface Probe {
  kind: ProbeKind
  cx: number
  cy: number
  radius: number
}

// Below this share of the frame the probes would be a handful of pixels and
// the reading would be noise; the caller asks the visitor to move closer.
export const MIN_FACE_FRACTION = 0.15

export function faceTooSmall(face: FaceGeometry, imageWidth: number): boolean {
  return face.box.width / imageWidth < MIN_FACE_FRACTION
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function planProbes(
  face: FaceGeometry, imageWidth: number, imageHeight: number,
): Probe[] {
  const eyeMid = midpoint(face.leftEye, face.rightEye)
  const eyeSpan = Math.abs(face.rightEye.x - face.leftEye.x)
  // A patch about a sixth of the eye span keeps cheeks clear of nose and ear.
  const radius = Math.max(1, Math.round(eyeSpan / 6))

  const browToBoxTop = eyeMid.y - face.box.y
  const cheekY = eyeMid.y + (face.mouth.y - eyeMid.y) * 0.55

  const candidates: Probe[] = [
    // Above the eyes but below the hairline: 40% of the way up to the box top.
    { kind: 'forehead', cx: eyeMid.x, cy: eyeMid.y - browToBoxTop * 0.4, radius },
    { kind: 'leftCheek', cx: (face.leftEye.x + face.leftEar.x) / 2, cy: cheekY, radius },
    { kind: 'rightCheek', cx: (face.rightEye.x + face.rightEar.x) / 2, cy: cheekY, radius },
    {
      kind: 'jaw',
      cx: face.mouth.x,
      cy: face.mouth.y + (face.box.y + face.box.height - face.mouth.y) * 0.55,
      radius,
    },
    // A band above the box top — hair if there is any.
    { kind: 'hair', cx: face.box.x + face.box.width / 2, cy: face.box.y - radius * 1.5, radius },
  ]

  // Drop, never clamp: a clamped probe silently samples the wrong thing.
  return candidates.filter((p) =>
    p.cx - p.radius >= 0 && p.cx + p.radius < imageWidth &&
    p.cy - p.radius >= 0 && p.cy + p.radius < imageHeight)
}
