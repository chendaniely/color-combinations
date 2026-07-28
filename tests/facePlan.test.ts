import { describe, expect, it } from 'vitest'
import { faceTooSmall, planProbes } from '../src/core/facePlan'
import type { FaceGeometry } from '../src/core/types'

// A synthetic upright face, 200px wide, centred in a 600x800 image.
const FACE: FaceGeometry = {
  box: { x: 200, y: 200, width: 200, height: 260 },
  leftEye: { x: 255, y: 290 },
  rightEye: { x: 345, y: 290 },
  nose: { x: 300, y: 340 },
  mouth: { x: 300, y: 395 },
  leftEar: { x: 205, y: 320 },
  rightEar: { x: 395, y: 320 },
}

describe('planProbes', () => {
  it('returns all five probe kinds', () => {
    const kinds = planProbes(FACE, 600, 800).map((p) => p.kind).sort()
    expect(kinds).toEqual(['forehead', 'hair', 'jaw', 'leftCheek', 'rightCheek'])
  })

  it('puts the forehead above the eye line', () => {
    const forehead = planProbes(FACE, 600, 800).find((p) => p.kind === 'forehead')!
    expect(forehead.cy).toBeLessThan(FACE.leftEye.y)
    expect(forehead.cy).toBeGreaterThan(FACE.box.y)
  })

  it('puts the hair band above the face box', () => {
    const hair = planProbes(FACE, 600, 800).find((p) => p.kind === 'hair')!
    expect(hair.cy).toBeLessThan(FACE.box.y)
  })

  it('puts cheeks between the eye line and the mouth, outside the nose', () => {
    const probes = planProbes(FACE, 600, 800)
    const left = probes.find((p) => p.kind === 'leftCheek')!
    const right = probes.find((p) => p.kind === 'rightCheek')!
    for (const c of [left, right]) {
      expect(c.cy).toBeGreaterThan(FACE.leftEye.y)
      expect(c.cy).toBeLessThan(FACE.mouth.y)
    }
    expect(left.cx).toBeLessThan(FACE.nose.x)
    expect(right.cx).toBeGreaterThan(FACE.nose.x)
  })

  it('puts the jaw below the mouth', () => {
    const jaw = planProbes(FACE, 600, 800).find((p) => p.kind === 'jaw')!
    expect(jaw.cy).toBeGreaterThan(FACE.mouth.y)
  })

  it('scales the probe radius with face size', () => {
    const big = planProbes(FACE, 600, 800)[0].radius
    const small = planProbes(
      {
        ...FACE,
        box: { ...FACE.box, width: 100, height: 130 },
        leftEye: { x: 280, y: 290 },
        rightEye: { x: 320, y: 290 },
      }, 600, 800,
    )[0].radius
    expect(big).toBeGreaterThan(small)
    expect(small).toBeGreaterThanOrEqual(1)
  })

  it('drops probes that fall outside the image instead of clamping them', () => {
    // Face pushed to the very top: the hair band would be off-image.
    const high: FaceGeometry = {
      ...FACE,
      box: { ...FACE.box, y: 2 },
      leftEye: { x: 255, y: 92 }, rightEye: { x: 345, y: 92 },
      nose: { x: 300, y: 142 }, mouth: { x: 300, y: 197 },
      leftEar: { x: 205, y: 122 }, rightEar: { x: 395, y: 122 },
    }
    expect(planProbes(high, 600, 800).some((p) => p.kind === 'hair')).toBe(false)
  })
})

describe('faceTooSmall', () => {
  it('is false for a face filling a third of the frame', () => {
    expect(faceTooSmall(FACE, 600)).toBe(false)
  })
  it('is true for a distant face', () => {
    const tiny = { ...FACE, box: { ...FACE.box, width: 60 } }
    expect(faceTooSmall(tiny, 600)).toBe(true)
  })
})
