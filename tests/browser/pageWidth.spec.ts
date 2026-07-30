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
    // The CONTENT's left edge, not the box's. The three views are full-bleed
    // boxes inset by padding — that is what keeps the scrollbar at the browser
    // edge — so their boxes all start at 0 and comparing those proves nothing.
    return {
      content: b.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      left: b.left + parseFloat(cs.paddingLeft),
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
      // One gutter in from the edge, not centred in a 241px column.
      expect(left).toBeLessThanOrEqual(16)
    })

  // The goggles stay on the WINDOW edge — the owner's call, reverted from a
  // brief experiment with aligning them to the column: "i also liked it when
  // the accessibilty goggles were on the right side ... now that it's moved in
  // towards the main content, it's a bit distracting."
  //
  // Which means the page rows have to keep clear of them themselves, and that
  // is bought with a LINE BREAK below 1100px rather than reserved padding: a
  // flat reserve is dead space on a wide screen and a third of the row on a
  // phone. LEAF controls only — the size-pill wrapper is full-width while its
  // buttons are not, and measuring wrappers reported collisions that were not
  // there, twice.
  for (const width of [390, 768, 1024, 1280, 1920]) {
    test(`no control runs under the goggles at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      for (const [tab, row] of [['Browse', '.browse-filters'], ['Match', '.match-head']] as const) {
        await page.goto('./')
        await page.getByRole('button', { name: tab }).first().click()
        await page.locator(row).waitFor()
        const bad = await page.evaluate((sel) => {
          const g = document.querySelector('.a11y-goggles')!.getBoundingClientRect()
          return [...document.querySelectorAll(`${sel} button, ${sel} select, ${sel} h1`)]
            .filter((el) => {
              const a = el.getBoundingClientRect()
              return a.width > 4 && a.left < g.right && g.left < a.right
                && a.top < g.bottom && g.top < a.bottom
            })
            .map((el) => (el.textContent || '').trim().slice(0, 24))
        }, row)
        expect(bad, `${tab}: controls under the goggles`).toEqual([])
      }
    })
  }
})
