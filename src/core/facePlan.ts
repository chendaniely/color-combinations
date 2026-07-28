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

// The eye line sits at the vertical midpoint between the crown and the chin —
// the standard facial proportion. We anchor to it because the DETECTOR'S BOX
// TOP IS NOT THE TOP OF THE HEAD: BlazeFace returns a box that starts around
// the brow line, so anything measured down from it lands a whole zone too low.
// (That was the 2026-07-28 bug: "forehead" on the glabella, "hair" on the
// forehead, so hair colour was read from skin. See tests/facePlanAnatomy.)
//
// The box BOTTOM is trustworthy — it sits at or just under the chin — so the
// eye-to-chin distance is the scale everything else is derived from.
const FOREHEAD_UP = 0.42   // of eye-to-chin, above the eyes: above brows, below hairline
// Comfortably above the hairline (~0.55) but back from the crown (~1.0), so a
// tightly-framed head still leaves room for the whole patch inside the image.
const HAIR_UP = 0.75

export function planProbes(
  face: FaceGeometry, imageWidth: number, imageHeight: number,
): Probe[] {
  const eyeMid = midpoint(face.leftEye, face.rightEye)
  const eyeSpan = Math.abs(face.rightEye.x - face.leftEye.x)
  // A patch about a sixth of the eye span keeps cheeks clear of nose and ear.
  const radius = Math.max(1, Math.round(eyeSpan / 6))

  const chinY = face.box.y + face.box.height
  const eyeToChin = Math.max(1, chinY - eyeMid.y)
  const cheekY = eyeMid.y + (face.mouth.y - eyeMid.y) * 0.55

  const candidates: Probe[] = [
    { kind: 'forehead', cx: eyeMid.x, cy: eyeMid.y - eyeToChin * FOREHEAD_UP, radius },
    { kind: 'leftCheek', cx: (face.leftEye.x + face.leftEar.x) / 2, cy: cheekY, radius },
    { kind: 'rightCheek', cx: (face.rightEye.x + face.rightEar.x) / 2, cy: cheekY, radius },
    { kind: 'jaw', cx: face.mouth.x, cy: face.mouth.y + (chinY - face.mouth.y) * 0.55, radius },
    // Up in the hair. If the head is cropped at the top of the frame this falls
    // outside and is dropped below — "no hair visible" is a better answer than
    // a sample of the frame edge.
    { kind: 'hair', cx: eyeMid.x, cy: eyeMid.y - eyeToChin * HAIR_UP, radius },
  ]

  // Drop, never clamp: a clamped probe silently samples the wrong thing.
  return candidates.filter((p) =>
    p.cx - p.radius >= 0 && p.cx + p.radius < imageWidth &&
    p.cy - p.radius >= 0 && p.cy + p.radius < imageHeight)
}
