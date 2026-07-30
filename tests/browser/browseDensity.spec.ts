import { expect, test } from '@playwright/test'

// How much of a phone screen is chrome before any colour appears.
//
// Browse is a grid of colour plates, and on a 390x844 phone the first plate
// used to land at y=479 — past the halfway line — because `.browse-filters`
// carried an unconditional `padding-right: 10rem` to clear the floating
// accessibility goggles. At 390px that reserve is 41% of the width, so both
// selects wrapped onto rows of their own and the filter bar stood three rows
// tall. The goggles do not sit beside the bar at that width, so the reserve was
// buying nothing and costing a third of the first screenful.
//
// A browser test by necessity: it is a question about wrapping under a real
// cascade at a real width, which is precisely what jsdom cannot answer.
test.describe('Browse on a phone', () => {
  test('reaches a combination within one screenful', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('./')
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.browse-grid > *').first().waitFor()

    const top = await page.locator('.browse-grid > *').first()
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    // THREE STATES, MEASURED 2026-07-30, all on an 844px screen — quoted
    // together because an earlier pair of comments mixed two baselines and made
    // both numbers unreproducible:
    //   479px  the merge-base, i.e. the whole defect (reserve + the old gap)
    //   455px  the reserve alone restored, keeping today's tighter gap
    //   418px  now
    //
    // The threshold WAS 422, the halfway line — 3.9px of headroom on a stack of
    // wrapped text and buttons, which moves with font metrics and font-loading.
    // 440 still fails against 455 and stops the guard being a flake waiting to
    // happen. The bar-height assertion below is the tight one.
    expect(top, 'a phone visitor scrolls past a screenful of chrome')
      .toBeLessThan(440)
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

      // The reserve is what forced each select onto a row of its own. Measured
      // at 390px wide, against the SAME three states as above: 157.75px at the
      // merge-base, 133.75px with the reserve alone restored, 96.75px now.
      // This is the assertion with real headroom, so it is the one that holds
      // the line.
      const bar = await page.locator('.browse-filters')
        .evaluate((el) => el.getBoundingClientRect().height)
      expect(bar, 'the filter bar has grown a row back').toBeLessThan(120)
    })

  // The goggles-overlap check that used to sit here moved to pageWidth.spec.ts,
  // which runs the identical intersection across five widths AND both rows
  // rather than two widths and one. Two copies failed together on one cause,
  // which is duplication rather than coverage.
})
