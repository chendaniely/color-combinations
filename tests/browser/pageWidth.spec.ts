import { expect, test } from '@playwright/test'

// One page width across Match, Browse and You.
//
// They were three different treatments: Browse and Match ran edge to edge with
// 2rem gutters, You was capped at 720px with 1rem, so moving between tabs moved
// the left margin under you. Owner, 2026-07-30: "the page width across the
// match/browse/you are all different ... let's make sure those parts of the UI
// are consistent and also works for mobile", then "can we pick a golden ratio
// value for all the pages?"
//
// A browser test because the width is a `clamp()` over `vw` resolved by the
// cascade at a real viewport size. jsdom computes no layout, so it cannot see
// any of this.
async function columnAt(page: import('@playwright/test').Page, tab: string, sel: string) {
  if (tab === 'You') await page.goto('./#/you?season=deep-autumn')
  else {
    await page.goto('./')
    await page.getByRole('button', { name: tab }).first().click()
  }
  await page.locator(sel).waitFor()
  return page.locator(sel).evaluate((el) => {
    const b = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      content: b.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      left: b.left,
    }
  })
}

const VIEWS = [['Browse', '.browse-view'], ['Match', '.match-view'], ['You', '.you-view']] as const

test.describe('one page width everywhere', () => {
  for (const width of [390, 1024, 1440, 1920]) {
    test(`Match, Browse and You line up at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const seen = []
      for (const [tab, sel] of VIEWS) seen.push({ tab, ...await columnAt(page, tab, sel) })

      // Same measure AND same left edge: a column that is the right width but
      // starts somewhere else still moves under the reader between tabs.
      for (const s of seen.slice(1)) {
        expect(s.content, `${s.tab} is a different width from Browse`)
          .toBeCloseTo(seen[0].content, 0)
        expect(s.left, `${s.tab} starts at a different left edge`)
          .toBeCloseTo(seen[0].left, 0)
      }
    })
  }

  test('the column and the page are in golden section on a large screen',
    async ({ page }) => {
      // The point of the value, and the thing a stray `max-width: 1100px` would
      // silently undo. 1/phi = 0.618: column : margins = 1.618 : 1.
      await page.setViewportSize({ width: 1440, height: 900 })
      const { content } = await columnAt(page, 'Browse', '.browse-view')
      expect(content / 1440).toBeCloseTo(0.618, 2)
    })

  test('a phone gets full width minus its gutter, not 61.8% of 390px',
    async ({ page }) => {
      // 61.8vw of a phone is 241px, which would be absurd. The 45rem floor plus
      // min(100% - gutters) is what stops the proportion applying where it
      // makes no sense.
      await page.setViewportSize({ width: 390, height: 844 })
      const { content, left } = await columnAt(page, 'Browse', '.browse-view')
      expect(content).toBeGreaterThan(330)
      expect(left).toBe(0)
    })

  test('the accessibility control sits on the column edge, not the window edge',
    async ({ page }) => {
      // It used to be pinned to the viewport, which left it stranded 335px out
      // in the margin on a wide screen — and made the reserve the filter rows
      // keep for it wrong at every width except by accident.
      await page.setViewportSize({ width: 1920, height: 900 })
      await page.goto('./')
      await page.getByRole('button', { name: 'Browse' }).first().click()
      await page.locator('.browse-filters').waitFor()
      const d = await page.evaluate(() => {
        const v = document.querySelector('.browse-view')!
        const b = v.getBoundingClientRect()
        const pr = parseFloat(getComputedStyle(v).paddingRight)
        const g = document.querySelector('.a11y-goggles')!.getBoundingClientRect()
        return Math.abs((b.right - pr) - g.right)
      })
      expect(d, 'the goggles are not aligned to the content edge').toBeLessThan(2)
    })
})
