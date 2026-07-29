import { describe, expect, it } from 'vitest'
import { planProbes } from '../src/core/facePlan'
import type { FaceGeometry } from '../src/core/types'

// A face with REAL proportions, which the original fixture did not have.
//
// The bug (reported 2026-07-28): BlazeFace's bounding box top sits at roughly
// the brow line, NOT the top of the head. Probes derived from the box top
// therefore landed one zone too low — "forehead" between the eyebrows and
// "hair" on the forehead, so hair colour was sampled from skin.
//
// Anatomy used here: the eye line sits at the vertical midpoint between crown
// and chin (the standard drawing proportion). Eyes at y=160, chin at y=260,
// crown at y=60 — with 60px of HEADROOM above the crown, because every real
// photograph has some. (An earlier version of this fixture put the crown at
// y=0, which made a correctly-placed hair probe fall off the frame and led to
// the constant being lowered to satisfy the fixture rather than reality.)
// BlazeFace reports a box from the brow (y=135) to the chin.
const HEADROOM = 60
const CROWN = HEADROOM
const EYES = 160
const CHIN = 260

const FACE: FaceGeometry = {
  // Box bottom at the chin exactly — the pessimistic case, since a box that
  // stops short of the chin under-estimates head height and drags every probe
  // downward. Getting hair right here means getting it right when the box runs
  // a little past the chin too.
  box: { x: 100, y: 135, width: 200, height: CHIN - 135 },
  leftEye: { x: 175, y: EYES },
  rightEye: { x: 225, y: EYES },
  nose: { x: 200, y: 200 },
  mouth: { x: 200, y: 225 },
  leftEar: { x: 105, y: 180 },
  rightEar: { x: 295, y: 180 },
}

const IMG_W = 400
const IMG_H = 400

function probe(kind: string) {
  return planProbes(FACE, IMG_W, IMG_H).find((p) => p.kind === kind)!
}

// A typical hairline sits a bit under half way from the crown down to the eyes.
const HAIRLINE = CROWN + (EYES - CROWN) * 0.42

describe('probe placement against real facial proportions', () => {
  it('samples hair well above the hairline, not on it', () => {
    const hair = probe('hair')
    // Reported by the owner at 0.75: "it's been at my hair line. not where my
    // actual hair is." A fringe or a high forehead puts skin at the hairline,
    // so the probe has to sit in the upper part of the hair mass.
    expect(hair.cy).toBeLessThan(CROWN + (HAIRLINE - CROWN) * 0.5)
    // ...but still below the crown, or it samples the background behind the head.
    expect(hair.cy - hair.radius).toBeGreaterThan(CROWN)
  })

  it('puts the forehead probe on the forehead, above the brows', () => {
    const forehead = probe('forehead')
    // Above the brow line (= the box top) so it cannot read eyebrow hair...
    expect(forehead.cy).toBeLessThan(FACE.box.y)
    // ...and below the hairline, so it cannot read hair.
    expect(forehead.cy).toBeGreaterThan(HAIRLINE)
  })

  it('keeps the forehead and hair probes well apart', () => {
    // The original bug had them ~27px apart on a 200px head, both on skin.
    const gap = probe('forehead').cy - probe('hair').cy
    expect(gap).toBeGreaterThan((EYES - CROWN) * 0.3)
  })

  it('still puts cheeks between the eyes and the mouth, outside the nose', () => {
    const left = probe('leftCheek')
    const right = probe('rightCheek')
    for (const c of [left, right]) {
      expect(c.cy).toBeGreaterThan(EYES)
      expect(c.cy).toBeLessThan(FACE.mouth.y)
    }
    expect(left.cx).toBeLessThan(FACE.nose.x)
    expect(right.cx).toBeGreaterThan(FACE.nose.x)
  })

  it('still puts the jaw between the mouth and the chin', () => {
    const jaw = probe('jaw')
    expect(jaw.cy).toBeGreaterThan(FACE.mouth.y)
    expect(jaw.cy).toBeLessThanOrEqual(CHIN + 15)
  })

  it('drops the hair probe when the head is cropped at the top of the frame', () => {
    // Shifted up so the crown is off-image: better to report "no hair visible"
    // than to sample the frame edge.
    const cropped: FaceGeometry = {
      ...FACE,
      box: { ...FACE.box, y: 5 },
      leftEye: { x: 175, y: 30 }, rightEye: { x: 225, y: 30 },
      nose: { x: 200, y: 70 }, mouth: { x: 200, y: 95 },
      leftEar: { x: 105, y: 50 }, rightEar: { x: 295, y: 50 },
    }
    expect(planProbes(cropped, IMG_W, IMG_H).some((p) => p.kind === 'hair')).toBe(false)
  })

  it('is unaffected by a loose bounding box', () => {
    // The box is the wrong ruler: a version anchored to it put the hair probe
    // 18px above the crown, in the background, for a box only 25px too tall.
    // Probes come from keypoints, so a wobbling box must change nothing.
    const loose: FaceGeometry = {
      ...FACE,
      box: { x: 80, y: 100, width: 240, height: FACE.box.height + 40 },
    }
    expect(planProbes(loose, IMG_W, IMG_H)).toEqual(planProbes(FACE, IMG_W, IMG_H))
  })

  it('is unaffected by a box that stops short of the chin', () => {
    const tight: FaceGeometry = {
      ...FACE,
      box: { ...FACE.box, height: FACE.box.height - 30 },
    }
    expect(planProbes(tight, IMG_W, IMG_H)).toEqual(planProbes(FACE, IMG_W, IMG_H))
  })
})
