import { describe, expect, it } from 'vitest'
import type { RGB } from '../src/core/colorMath'
import { photoWarnings, WARNING_TEXT } from '../src/core/photoQuality'

// A believable mid-tone skin sample, and small natural variation around it.
const MID: RGB = [198, 152, 122]
const near = (d: number): RGB => [198 + d, 152 + d, 122 + d]

describe('photo quality warnings', () => {
  it('says nothing about a decent photo', () => {
    expect(photoWarnings([MID, near(6), near(-5), near(3)])).toEqual([])
  })

  it('says nothing when there is nothing to judge', () => {
    expect(photoWarnings([])).toEqual([])
  })

  it('flags a dark frame', () => {
    expect(photoWarnings([[40, 30, 25], [44, 33, 28]])).toContain('dark')
  })

  it('flags a blown-out frame by clipped channels', () => {
    expect(photoWarnings([[255, 250, 244], [254, 249, 240]])).toContain('blownOut')
  })

  it('does not call a bright but unclipped photo blown out', () => {
    expect(photoWarnings([[228, 200, 186], [231, 203, 189]])).not.toContain('blownOut')
  })

  it('flags a face lit hard from one side', () => {
    // One cheek in light, the other in shadow.
    expect(photoWarnings([[214, 176, 150], [96, 74, 60]])).toContain('unevenLight')
  })

  it('tolerates the normal variation between forehead, cheeks and jaw', () => {
    expect(photoWarnings([MID, near(14), near(-12), near(9)])).not.toContain('unevenLight')
  })

  it('can report more than one problem at once', () => {
    // Mean luma 46.5 (dark), and the two samples 101 apart (uneven).
    const w = photoWarnings([[20, 16, 14], [90, 72, 60]])
    expect(w).toContain('dark')
    expect(w).toContain('unevenLight')
  })

  it('has actionable text for every warning it can produce', () => {
    for (const key of ['dark', 'blownOut', 'unevenLight'] as const) {
      expect(WARNING_TEXT[key].length).toBeGreaterThan(20)
    }
  })
})
