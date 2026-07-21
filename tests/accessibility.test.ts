import { describe, expect, it } from 'vitest'
import {
  LENSES, accessibilityProfile, allowedComboIds,
  WCAG_AA_TEXT, WCAG_NONTEXT, CVD_THRESHOLD,
} from '../src/color/accessibility'
import type { AccessLensId } from '../src/core/types'
import { dataset } from '../src/data'

const passes = (id: AccessLensId, hexes: string[]) =>
  LENSES.find((l) => l.id === id)!.passes(hexes)

describe('accessibility lens predicates', () => {
  it('exposes the exact thresholds', () => {
    expect([WCAG_AA_TEXT, WCAG_NONTEXT, CVD_THRESHOLD]).toEqual([4.5, 3, 0.10])
  })
  it('web-text: passes when a pair reaches AA text contrast', () => {
    expect(passes('web-text', ['#000000', '#ffffff'])).toBe(true)   // 21:1
    expect(passes('web-text', ['#777777', '#808080'])).toBe(false)  // ~1.13:1
    expect(passes('web-text', ['#000000', '#ffffff', '#fefefe'])).toBe(true) // one strong pair is enough
  })
  it('print-bw: needs EVERY pair >= 3:1 (a near-white pair fails)', () => {
    expect(passes('print-bw', ['#000000', '#ffffff'])).toBe(true)
    expect(passes('print-bw', ['#000000', '#ffffff', '#fefefe'])).toBe(false) // #fff vs #fefefe ~1.01:1
  })
  it('colorblind: red/dark-green collapses under simulation; black/white stays distinct', () => {
    expect(passes('colorblind', ['#ff0000', '#008000'])).toBe(false) // deuter distance ~0.054 < 0.10
    expect(passes('colorblind', ['#000000', '#ffffff'])).toBe(true)  // luminance differs → ~1.0
  })
})

describe('accessibilityProfile + allowedComboIds over the real book', () => {
  const profile = accessibilityProfile(dataset)
  const count = (id: AccessLensId) => [...profile.values()].filter((s) => s.has(id)).length

  it('profiles every displayable combo with the expected survivor counts', () => {
    expect(profile.size).toBe(338)
    expect(count('web-text')).toBe(150)
    expect(count('print-bw')).toBe(57)
    expect(count('colorblind')).toBe(225)
  })
  it('allowedComboIds AND-stacks: all three is 36 and a subset of each single lens', () => {
    const all3 = allowedComboIds(profile, ['web-text', 'print-bw', 'colorblind'])
    expect(all3.size).toBe(36)
    const web = allowedComboIds(profile, ['web-text'])
    expect(web.size).toBe(150)
    expect([...all3].every((id) => web.has(id))).toBe(true)
  })
})
