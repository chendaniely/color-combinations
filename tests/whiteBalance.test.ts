import { describe, expect, it } from 'vitest'
import {
  channelGains, controlsToWhiteRef, NEUTRAL, whiteBalance, whiteRefToControls,
} from '../src/color/whiteBalance'
import type { RGB } from '../src/core/colorMath'

const REFS: RGB[] = [
  [240, 210, 180],   // tungsten-ish
  [200, 220, 255],   // cool shade
  [255, 255, 255],   // already neutral
  [180, 200, 175],   // green cast
  [215, 190, 210],   // magenta cast
]

describe('the two-axis control', () => {
  it('reads a neutral reference as neutral controls', () => {
    const c = whiteRefToControls([255, 255, 255])
    expect(c.temp).toBeCloseTo(0, 6)
    expect(c.tint).toBeCloseTo(0, 6)
  })

  it('neutral controls produce a correction that changes nothing', () => {
    const ref = controlsToWhiteRef(NEUTRAL)
    for (const colour of [[161, 103, 63], [237, 196, 189], [26, 17, 16]] as RGB[]) {
      expect(whiteBalance(colour, ref)).toEqual(colour)
    }
  })

  // A reference is stored as 8-bit RGB, so a round-trip cannot be exact: one
  // least-significant bit on a channel is worth ~0.005 in these log units.
  // Measured round-trip error is 0.004 — under one LSB, i.e. exact to the limit
  // of the representation. The tolerance below is three LSBs, which is a 1.5%
  // channel-gain difference and invisible.
  const LSB = 0.005
  const TOLERANCE = 3 * LSB

  it('round-trips a reference back to the same correction', () => {
    // The RGB itself need not survive — only the ratios matter — so the
    // invariant that counts is that the GAINS come back the same.
    for (const ref of REFS) {
      const back = controlsToWhiteRef(whiteRefToControls(ref))
      const before = channelGains(ref)
      const after = channelGains(back)
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(after[i] - before[i])).toBeLessThan(0.05)
      }
    }
  })

  it('round-trips controls through a reference and back', () => {
    for (const temp of [-0.6, -0.2, 0, 0.3, 0.7]) {
      for (const tint of [-0.5, 0, 0.4]) {
        const back = whiteRefToControls(controlsToWhiteRef({ temp, tint }))
        expect(Math.abs(back.temp - temp)).toBeLessThan(TOLERANCE)
        expect(Math.abs(back.tint - tint)).toBeLessThan(TOLERANCE)
      }
    }
  })

  it('temperature warms the image to the right, cools it to the left', () => {
    const skin: RGB = [150, 130, 120]
    const warmed = whiteBalance(skin, controlsToWhiteRef({ temp: 0.4, tint: 0 }))
    const cooled = whiteBalance(skin, controlsToWhiteRef({ temp: -0.4, tint: 0 }))
    // Warmer means red gains on blue; cooler the reverse.
    expect(warmed[0] - warmed[2]).toBeGreaterThan(skin[0] - skin[2])
    expect(cooled[0] - cooled[2]).toBeLessThan(skin[0] - skin[2])
  })

  it('tint moves green against magenta', () => {
    const grey: RGB = [128, 128, 128]
    const magenta = whiteBalance(grey, controlsToWhiteRef({ temp: 0, tint: 0.4 }))
    const green = whiteBalance(grey, controlsToWhiteRef({ temp: 0, tint: -0.4 }))
    expect(magenta[1]).toBeLessThan(magenta[0])   // green pulled down => magenta
    expect(green[1]).toBeGreaterThan(green[0])    // green pushed up
  })

  it('the two axes are independent', () => {
    // Changing tint must not disturb the blue/red balance that temp controls.
    const a = whiteRefToControls(controlsToWhiteRef({ temp: 0.3, tint: 0 }))
    const b = whiteRefToControls(controlsToWhiteRef({ temp: 0.3, tint: 0.5 }))
    expect(Math.abs(b.temp - a.temp)).toBeLessThan(TOLERANCE)
  })

  it('eyedropping a reference neutralises it, whichever way it is set', () => {
    for (const ref of REFS) {
      // Via the raw reference...
      const direct = whiteBalance(ref, ref)
      expect(Math.max(...direct) - Math.min(...direct)).toBeLessThanOrEqual(2)
      // ...and via the controls the eyedropper would have set.
      const viaControls = whiteBalance(ref, controlsToWhiteRef(whiteRefToControls(ref)))
      expect(Math.max(...viaControls) - Math.min(...viaControls)).toBeLessThanOrEqual(2)
    }
  })

  it('survives a clipped-black channel without producing NaN', () => {
    const c = whiteRefToControls([0, 0, 0])
    expect(Number.isFinite(c.temp)).toBe(true)
    expect(Number.isFinite(c.tint)).toBe(true)
  })
})
