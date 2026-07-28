import { describe, expect, it } from 'vitest'
import { medianColor, rejectOutliers, robustColor, samplesInPatch } from '../src/core/robustSample'
import type { RGB } from '../src/core/colorMath'

describe('medianColor', () => {
  it('returns null for no samples', () => {
    expect(medianColor([])).toBeNull()
  })
  it('takes the per-channel median', () => {
    const s: RGB[] = [[10, 20, 30], [50, 60, 70], [90, 100, 110]]
    expect(medianColor(s)).toEqual([50, 60, 70])
  })
  it('averages the two middle values for an even count', () => {
    const s: RGB[] = [[10, 10, 10], [20, 20, 20], [30, 30, 30], [40, 40, 40]]
    expect(medianColor(s)).toEqual([25, 25, 25])
  })
})

describe('rejectOutliers', () => {
  it('drops a far sample and keeps the cluster', () => {
    const skin: RGB[] = [[200, 150, 120], [202, 152, 118], [198, 148, 122], [201, 151, 119]]
    const withBrow: RGB[] = [...skin, [20, 15, 12]]
    expect(rejectOutliers(withBrow)).toHaveLength(4)
  })
  it('keeps everything when the samples agree', () => {
    const s: RGB[] = [[200, 150, 120], [202, 152, 118], [198, 148, 122]]
    expect(rejectOutliers(s)).toHaveLength(3)
  })
})

describe('robustColor', () => {
  it('a single dark eyebrow pixel cannot move the reading', () => {
    const skin: RGB[] = Array.from({ length: 20 }, (_, i) => [200 + (i % 3), 150, 120] as RGB)
    const clean = robustColor(skin)!
    const dirty = robustColor([...skin, [10, 8, 6]])!
    expect(dirty).toEqual(clean)
  })
  it('returns null when there is nothing to sample', () => {
    expect(robustColor([])).toBeNull()
  })
})

describe('samplesInPatch', () => {
  it('returns one sample per pixel in the patch', () => {
    // 5x5 image, every pixel mid-grey.
    const data = new Uint8ClampedArray(5 * 5 * 4).fill(128)
    const got = samplesInPatch(data, 5, 5, 2, 2, 1)
    expect(got).toHaveLength(9)          // 3x3 patch
    expect(got[0]).toEqual([128, 128, 128])
  })
  it('clips the patch to the image bounds', () => {
    const data = new Uint8ClampedArray(5 * 5 * 4).fill(128)
    expect(samplesInPatch(data, 5, 5, 0, 0, 2)).toHaveLength(9)  // 3x3 of the 5x5 corner
  })
})
