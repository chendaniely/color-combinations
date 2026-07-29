import { describe, expect, it } from 'vitest'
import { hairIsActuallySkin, readSkin } from '../src/color/skinMetrics'
import type { RGB } from '../src/core/colorMath'

const SKIN: RGB = [198, 152, 122]

// If the hair probe lands on a fringe, a receding hairline or a bald head, it
// reads skin. Left in, that produced a confident contrast reading built from
// comparing the face with itself: always a tiny gap, so always "low contrast",
// for anyone whose hair the single probe happened to miss.
describe('a hair sample that is really skin', () => {
  it('is recognised when it is the very same pixel', () => {
    expect(hairIsActuallySkin(SKIN, SKIN)).toBe(true)
  })

  it('is recognised through ordinary sampling noise', () => {
    expect(hairIsActuallySkin(SKIN, [201, 155, 126])).toBe(true)
  })

  it('is dropped from the reading, which then reports no hair', () => {
    const reading = readSkin(SKIN, [200, 154, 124], null)
    expect(reading.hair).toBeNull()
    expect(reading.contrastGap).toBeNull()
  })

  it('leaves the rest of the reading untouched', () => {
    const withFakeHair = readSkin(SKIN, [200, 154, 124], null)
    const withNoHair = readSkin(SKIN, null, null)
    expect(withFakeHair.skin).toBe(withNoHair.skin)
    expect(withFakeHair.undertone).toBe(withNoHair.undertone)
    expect(withFakeHair.depth).toBe(withNoHair.depth)
  })

  it('has no opinion when there was no hair sample at all', () => {
    expect(hairIsActuallySkin(SKIN, null)).toBe(false)
  })
})

describe('real hair is kept', () => {
  it('keeps dark hair against light skin', () => {
    const reading = readSkin(SKIN, [26, 17, 16], null)
    expect(reading.hair).not.toBeNull()
    expect(reading.contrast).toBe('high')
  })

  // The guard must not steal the "low contrast" reading from the people it
  // exists to describe. Fair blonde hair against fair skin is a genuinely
  // small gap -- but it is a real one, and far larger than sampling noise.
  it('keeps fair hair against fair skin, and still calls it low contrast', () => {
    const fairSkin: RGB = [232, 205, 186]
    const fairHair: RGB = [206, 178, 140]
    expect(hairIsActuallySkin(fairSkin, fairHair)).toBe(false)
    const reading = readSkin(fairSkin, fairHair, null)
    expect(reading.hair).not.toBeNull()
    expect(reading.contrast).toBe('low')
  })
})
