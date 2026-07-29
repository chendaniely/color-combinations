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

// EVERY PROBE IS DERIVED FROM KEYPOINTS, NEVER FROM THE BOUNDING BOX.
//
// The box is the wrong ruler in both directions. Its top is not the top of the
// head — BlazeFace starts it around the brow line, so measuring down from it
// put "forehead" on the glabella and "hair" on the forehead, reading skin as
// hair (the 2026-07-28 bug). And its bottom is only loosely at the chin: a box
// running 25px past it inflated the head estimate enough to push the hair probe
// off the crown into the background. Keypoints do not wobble like that.
//
// Scale comes from the eye-to-mouth distance. The mouth sits about two thirds
// of the way from the eye line to the chin, and the eye line sits at the
// vertical midpoint between crown and chin, so:
//     eye-to-chin  ≈  eye-to-crown  ≈  1.5 × eye-to-mouth
const CHIN_FROM_MOUTH = 1.5
const FOREHEAD_UP = 0.42   // of eye-to-chin, above the eyes: above brows, below hairline
// Well up into the hair, not near the hairline: a fringe, a receding hairline
// or a high forehead all put skin where the hairline nominally is, and reading
// skin as hair corrupts the contrast axis silently. Backed off from the crown
// estimate (1.0) so hair is sampled rather than the background behind the head.
const HAIR_UP = 0.88

export function planProbes(
  face: FaceGeometry, imageWidth: number, imageHeight: number,
): Probe[] {
  const eyeMid = midpoint(face.leftEye, face.rightEye)
  const eyeSpan = Math.abs(face.rightEye.x - face.leftEye.x)
  // A patch about a sixth of the eye span keeps cheeks clear of nose and ear.
  const radius = Math.max(1, Math.round(eyeSpan / 6))

  const eyeToMouth = Math.max(1, face.mouth.y - eyeMid.y)
  const eyeToChin = eyeToMouth * CHIN_FROM_MOUTH
  const chinY = eyeMid.y + eyeToChin
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
