import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { reachThePalette } from './seasonHelpers'

// The corner mark, and the You tab's doorways.
//
// Both are browser tests by necessity: "does this element stay put while the
// page scrolls" is a question about layout and scrolling, and jsdom has
// neither. That is exactly why the bug survived — the mark sat in a plain
// <footer>, which on the wheel lands at the bottom of the viewport and LOOKS
// pinned. The You tab, with fifty swatches, was the first page long enough to
// reveal it.
const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string

test.describe('the corner mark', () => {
  test('stays in the corner while the page scrolls', async ({ page }) => {
    // The You tab specifically: it is the longest page on the site (fifty
    // swatches plus the combination grid) and the one the owner reported this
    // on. Browse at the test viewport is not tall enough to scroll at all,
    // which made a first version of this test pass vacuously by timing out.
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })

    const before = await page.locator('.site-mark').boundingBox()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForFunction(() => window.scrollY > 200)
    const after = await page.locator('.site-mark').boundingBox()

    expect(after!.y, 'the mark scrolled away with the page').toBe(before!.y)
  })

  test('shows the released version, taken from package.json', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.site-version')).toHaveText(`v${version}`)
  })

  test('links to what changed, not just to the repository', async ({ page }) => {
    await page.goto('./')
    const href = await page.locator('.site-version').getAttribute('href')
    expect(href).toContain('CHANGELOG.md')
  })

  test('does not swallow clicks meant for the page underneath', async ({ page }) => {
    await page.goto('./')
    await page.locator('.chord-wheel').waitFor()
    // The mark is fixed over the content, so only the link itself may be
    // clickable — otherwise it would block a corner of every screen.
    const events = await page.locator('.site-mark').evaluate(
      (el) => getComputedStyle(el).pointerEvents)
    expect(events).toBe('none')
    const link = await page.locator('.site-version').evaluate(
      (el) => getComputedStyle(el).pointerEvents)
    expect(link).toBe('auto')
  })
})

// Document-relative tops, so these hold whatever the page happens to be
// scrolled to. `boundingBox()` is viewport-relative and Playwright scrolls
// elements into view before clicking, so comparing two of them after a
// multi-step flow silently depends on where the walk left the page.
function topsOf(page: import('@playwright/test').Page, selector: string) {
  return page.locator(selector).evaluateAll(
    (els) => els.map((e) => e.getBoundingClientRect().top + window.scrollY))
}

async function topOf(page: import('@playwright/test').Page, selector: string) {
  const [top] = await topsOf(page, selector)
  return top
}

test.describe('the You tab doorways', () => {
  test('there is exactly one set of buttons, not a copy per section',
    async ({ page }) => {
      await reachThePalette(page)
      await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
      // The in-flow copies went from one to two to briefly three, each time to
      // reach a reader who had scrolled. Owner: "since i have those buttons
      // repeated 3 times on the pages now. maybe we have those brose/start be a
      // floating set of buttons". One that travels beats three that don't.
      await expect(page.locator('.you-doorways')).toHaveCount(1)
      await expect(page.locator('.you-doorway-note')).toHaveCount(1)
      // The explanation stays with the swatches, the only place "pick any
      // swatch above" is true.
      expect(await topOf(page, '.you-doorway-note'),
        'the explanation is not below the swatches')
        .toBeGreaterThan(await topOf(page, '.you-swatches'))
    })

  test('travels with the reader down both long lists', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
    const bar = page.locator('.you-doorways')

    // This is the whole feature, and it is invisible to jsdom: `position:
    // sticky` is a layout behaviour, so only a real browser scrolling a real
    // page can tell whether the bar stayed.
    const before = (await bar.boundingBox())!
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForFunction(() => window.scrollY > 200)
    const after = (await bar.boundingBox())!

    expect(after.y, 'the bar scrolled away with the page').toBeLessThan(before.y + 1)
    expect(after.y, 'the bar is off the top of the screen').toBeGreaterThanOrEqual(0)
    // And still usable where it landed, not merely present in the DOM.
    await expect(bar.getByRole('button', { name: /browse all/i })).toBeVisible()
    await expect(bar.getByRole('button', { name: /start a palette from/i })).toBeVisible()
  })

  // Why the bar sticks to the TOP rather than floating at the bottom: the corner
  // mark is fixed bottom-right, and two things pinned to the same corner is how
  // one of them ends up under the other. Checked where the bar spends the visit
  // — pinned — not at the resting position it holds for one screen of scroll,
  // which sits in the flow and passes under the mark exactly as any paragraph
  // does. Phone width included because that is where the content column is wide
  // enough to reach the corner at all.
  for (const [where, size] of [
    ['desktop', null], ['phone', { width: 390, height: 780 }],
  ] as const) {
    test(`the pinned bar clears the corner mark on ${where}`, async ({ page }) => {
      if (size) await page.setViewportSize(size)
      await reachThePalette(page)
      await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
      await page.waitForFunction(() => window.scrollY > 200)

      // A true rectangle intersection. Comparing only the vertical extents
      // called a collision on desktop, where the two are in different columns
      // and never touch.
      const hit = await page.evaluate(() => {
        const a = document.querySelector('.you-doorways')!.getBoundingClientRect()
        const b = document.querySelector('.site-mark')!.getBoundingClientRect()
        return a.left < b.right && b.left < a.right
          && a.top < b.bottom && b.top < a.bottom
      })
      expect(hit, 'the pinned bar overlaps the corner mark').toBe(false)
    })
  }

  test('the photo button sits in the first screenful, above the palette',
    async ({ page }) => {
      await reachThePalette(page)
      await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
      // It used to be LAST, under the palette and the whole combination grid.
      // With a reading (or a season from a shared link) already on screen, the
      // one control a first-time visitor needs was several screens down.
      const actions = await topOf(page, '.you-actions')
      expect(actions, 'the photo button is not above the palette')
        .toBeLessThan(await topOf(page, '.you-palettes'))
      expect(actions, 'the photo button is below the fold')
        .toBeLessThan(page.viewportSize()!.height)
    })

  test('starts a palette from the swatch the visitor picks', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })

    const button = page.getByRole('button', { name: /start a palette from/i }).first()
    const before = await button.innerText()

    // Picking any swatch retargets the button. It used to assume the first,
    // which is a guess about somebody looking at fifty colours.
    await page.locator('.you-swatch').nth(5).click()
    await expect(button).not.toHaveText(before)

    const name = await page.locator('.you-swatch').nth(5).innerText()
    expect(await button.innerText()).toContain(name.split('\n')[0])
  })

  test('the swatch grid is one tab stop, not fifty', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
    // The defect useRovingFocus exists to prevent, and a fifty-swatch grid is
    // the worst case for it on the whole site.
    const tabbable = await page.locator('.you-swatches [role="option"]')
      .evaluateAll((els) => els.filter((e) => e.getAttribute('tabindex') === '0').length)
    expect(tabbable, 'more than one swatch is in the tab order').toBe(1)
  })

  test('arrow keys move the selection within the grid', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
    const button = page.getByRole('button', { name: /start a palette from/i }).first()

    await page.locator('.you-swatch').first().click()
    const before = await button.innerText()
    await page.keyboard.press('ArrowRight')
    await expect(button).not.toHaveText(before)
  })
})
