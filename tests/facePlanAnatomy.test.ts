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
// and chin (the standard drawing proportion). Crown at y=0, eyes at y=100,
// chin at y=200. BlazeFace reports a box from the brow (y=75) to just under
// the chin (y=210).
const CROWN = 0
const EYES = 100
const CHIN = 200

const FACE: FaceGeometry = {
  box: { x: 100, y: 75, width: 200, height: 135 },
  leftEye: { x: 175, y: EYES },
  rightEye: { x: 225, y: EYES },
  nose: { x: 200, y: 140 },
  mouth: { x: 200, y: 165 },
  leftEar: { x: 105, y: 120 },
  rightEar: { x: 295, y: 120 },
}

const IMG_W = 400
const IMG_H = 400

function probe(kind: string) {
  return planProbes(FACE, IMG_W, IMG_H).find((p) => p.kind === kind)!
}

describe('probe placement against real facial proportions', () => {
  it('puts the hair probe above the crown line, not on the forehead', () => {
    const hair = probe('hair')
    // Must be in the top fifth of the head — actual hair, not skin.
    expect(hair.cy).toBeLessThan(CROWN + (EYES - CROWN) * 0.25)
    // And unambiguously above the detector's box top (the brow).
    expect(hair.cy).toBeLessThan(FACE.box.y)
  })

  it('puts the forehead probe on the forehead, above the brows', () => {
    const forehead = probe('forehead')
    // Above the brow line (= the box top) so it cannot read eyebrow hair...
    expect(forehead.cy).toBeLessThan(FACE.box.y)
    // ...and below the hairline, so it cannot read hair.
    expect(forehead.cy).toBeGreaterThan(CROWN + (EYES - CROWN) * 0.3)
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
})
