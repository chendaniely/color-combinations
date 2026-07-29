import { expect, test } from '@playwright/test'
import { ACCENT, computed, LINK, openPicker } from './helpers'

// Regression tests for the five user-visible defects that shipped past a green
// unit suite. Every one was logic-correct -- no assertion about state or maths
// would have caught any of them -- and every one was found by a human opening a
// browser. They are grouped here so the reason this suite exists stays legible.
//
// Recorded in TODO.md as: "FIVE user-visible defects shipped past a green
// 199-test suite, a review after every task, and a whole-branch review."

test.describe('defects that only a real browser can see', () => {
  // 1. The disc's white saturation wash faded out at 78% of the radius, so
  //    every colour rendered more saturated than the HSV numbers beneath it
  //    said. The control lied about its own value.
  test('the disc\'s saturation wash reaches the rim, not 78% of it', async ({ page }) => {
    await openPicker(page)
    const bg = await computed(page, '.pick-face', 'background-image')
    // Chromium omits a final colour stop at 100% because that is the default,
    // so "reaches the rim" reads as "the transparent stop carries NO explicit
    // position". Any short stop — 78%, 90% — would appear here.
    expect(bg).toMatch(/radial-gradient\(/)
    expect(bg).not.toMatch(/rgba\(255, 255, 255, 0\)\s+\d/)
    expect(bg).not.toContain('78%')
  })

  // 2. On a short viewport the overlay centred its content, and a centred
  //    scrolling container clips the START of its content -- which cannot then
  //    be scrolled back into view. The Explore button became unreachable.
  test('every control stays reachable on a short viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 520 })
    await openPicker(page)

    // The top of the content must not be clipped above the scroll origin.
    const steps = page.locator('.cam-steps')
    const box = await steps.boundingBox()
    expect(box, 'the instructions should be laid out').not.toBeNull()
    expect(box!.y).toBeGreaterThanOrEqual(0)

    // And the primary action must be reachable by scrolling, then clickable.
    const explore = page.getByRole('button', { name: /explore this color/i })
    await explore.scrollIntoViewIfNeeded()
    await expect(explore).toBeInViewport()
    await expect(explore).toBeEnabled()
  })

  // 3. Colour codes rendered in the UI font instead of the mono one, because
  //    the picker sits inside `.search-box` and `.search-box input` (0,1,1)
  //    outranked the overlay's own single-class rule. This is the cascade bug
  //    the portal in Overlay.tsx now makes structurally impossible.
  test('colour codes render in the mono face, not the UI face', async ({ page }) => {
    await openPicker(page)
    const family = await computed(page, '.pick-input', 'font-family')
    expect(family).toContain('Atkinson Hyperlegible Mono')
  })

  // 4. A focused field turned the same orange as an invalid one, so a valid
  //    field being typed into looked like an error.
  test('a focused field does not wear the invalid colour', async ({ page }) => {
    await openPicker(page)
    // Scoped to the dialog: the header's sampler button is also labelled
    // "...from a photo or hex", so a bare getByLabel matches two elements.
    const hex = page.getByRole('dialog', { name: 'Pick a color' }).getByLabel('HEX')

    await hex.focus()
    const focused = await computed(page, '.pick-input', 'border-bottom-color')
    expect(focused).toBe(LINK)

    await hex.fill('nonsense')
    await expect(hex).toHaveAttribute('aria-invalid', 'true')
    const invalid = await computed(page, '.pick-input', 'border-bottom-color')
    expect(invalid).toBe(ACCENT)

    // The point of the test: the two states must be distinguishable.
    expect(focused).not.toBe(invalid)
  })

  // 5. The "BRIGHT" label ran underneath its own slider.
  test('the brightness label does not run under its slider', async ({ page }) => {
    await openPicker(page)
    const label = await page.locator('.pick-bright .pick-label').boundingBox()
    const slider = await page.locator('.pick-bright input[type=range]').boundingBox()
    expect(label).not.toBeNull()
    expect(slider).not.toBeNull()
    // Laid out side by side: the label must end before the slider begins.
    expect(label!.x + label!.width).toBeLessThanOrEqual(slider!.x + 1)
  })
})

// The 2026-07-28 tap-misalignment bug: flexbox squashed .probe-stage's height
// from 422.1 to 386.7 while its width stayed 420, breaking the aspect ratio so
// object-fit letterboxed the photo and taps landed 37px off. The fix was
// `flex: 0 0 auto`. 335 unit tests could not see it, because jsdom does no
// layout at all.
test('the probe stage is not flex-shrinkable, so its aspect ratio holds', async ({ page }) => {
  await page.goto('./')
  const shrink = await page.evaluate(() => {
    const style = [...document.styleSheets]
      .flatMap((s) => {
        try { return [...s.cssRules] } catch { return [] }
      })
      .find((r) => r instanceof CSSStyleRule && r.selectorText === '.probe-stage') as CSSStyleRule
    return style?.style.flexShrink ?? null
  })
  expect(shrink, '.probe-stage must not be allowed to shrink').toBe('0')
})
