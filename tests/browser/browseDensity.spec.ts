import { expect, test } from '@playwright/test'

// How much of a phone screen is chrome before any colour appears.
//
// Browse is a grid of colour plates, and on a 390x844 phone the first plate
// used to land at y≈470 — past the halfway line — because `.browse-filters`
// carried an unconditional `padding-right: 10rem` to clear the floating
// accessibility goggles. At 390px that reserve is 41% of the width, so both
// selects wrapped onto rows of their own and the filter bar stood three rows
// tall. The goggles do not sit beside the bar at that width, so the reserve was
// buying nothing and costing a third of the first screenful.
//
// A browser test by necessity: it is a question about wrapping under a real
// cascade at a real width, which is precisely what jsdom cannot answer.
test.describe('Browse on a phone', () => {
  test('reaches a combination in the top half of the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('./')
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.browse-grid > *').first().waitFor()

    const top = await page.locator('.browse-grid > *').first()
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    // Measured 2026-07-30: 471px before the fix, 410px after, on an 844px
    // screen. The threshold is the halfway line, which the old value cleared
    // and the new one does not — an earlier draft asserted merely "on screen
    // at all" and passed identically with the bug restored, which is a guard
    // that guards nothing.
    expect(top, 'a phone visitor still scrolls past half a screen of chrome')
      .toBeLessThan(422)
  })

  test('the filter bar does not reserve desktop space it cannot use',
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('./')
      await page.getByRole('button', { name: 'Browse' }).first().click()
      await page.locator('.browse-filters').waitFor()

      const pad = await page.locator('.browse-filters').evaluate(
        (el) => getComputedStyle(el).paddingRight)
      expect(parseFloat(pad), 'a desktop-only reserve is still applied on a phone')
        .toBeLessThan(32)

      // The reserve is what forced each select onto a row of its own: the bar
      // stood 157.75px tall and now stands 97px, measured at 390px wide.
      const bar = await page.locator('.browse-filters')
        .evaluate((el) => el.getBoundingClientRect().height)
      expect(bar, 'the filter bar has grown a row back').toBeLessThan(120)
    })

  // BOTH widths. Checking only the desktop one is how the first attempt at this
  // shipped a worse bug than it fixed: the reserve came off, the bar halved as
  // intended, and the goggles landed squarely on the family select. The reserve
  // was doing real work at phone width too; it was the WAY it bought the space
  // that was wrong, not the buying.
  for (const [where, size] of [
    ['a phone', { width: 390, height: 844 }],
    ['a desktop', { width: 1280, height: 800 }],
  ] as const) {
    test(`no filter control sits under the goggles on ${where}`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto('./')
      await page.getByRole('button', { name: 'Browse' }).first().click()
      await page.locator('.browse-filters').waitFor()

      // Against the CONTROLS, not the container. `padding-right` does not shrink
      // the element's box — the box still spans the row and always intersects
      // the goggles. What the reserve protects is the content inside it, so that
      // is what has to be measured. Checking the container reported a collision
      // at every width, including the one where the reserve works.
      const hit = await page.evaluate(() => {
        const g = document.querySelector('.a11y-goggles')!.getBoundingClientRect()
        // LEAF CONTROLS, not their wrappers. The size-pill wrapper is a
        // full-width flex row whose three 30px buttons sit at the far left, so
        // measuring it reports an overlap the visitor cannot see. Second time
        // this exact mistake produced a false reading in this file; the rule is
        // that only a thing with ink on it can collide.
        const leaves = '.browse-filters button, .browse-filters select'
        return [...document.querySelectorAll(leaves)].some((el) => {
          const a = el.getBoundingClientRect()
          return a.left < g.right && g.left < a.right
            && a.top < g.bottom && g.top < a.bottom
        })
      })
      expect(hit, 'a filter control runs under the goggles').toBe(false)
    })
  }
})
