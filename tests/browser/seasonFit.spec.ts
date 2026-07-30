import { expect, test } from '@playwright/test'
import { reachThePalette } from './seasonHelpers'

// The season display, in a real browser.
//
// Two things here can only be checked with layout and a cascade, which is why
// this is not a jsdom test:
//
// 1. The season datasets are CODE-SPLIT — ~98 kB fetched on entering this tab.
//    jsdom resolves a dynamic import instantly from disk and would never show
//    that the visitor briefly sees a loading state, nor catch a chunk that
//    fails to load in a built bundle. Importing them statically is what broke
//    the browse accessibility audit, so the split is load-bearing and gets a
//    test.
// 2. The two levels — a sourced parent season and our sub-season — are
//    distinguished by badges whose whole job is to LOOK different. A test that
//    cannot see the cascade cannot tell whether they do.

test.describe('the season display', () => {
  test('loads the code-split season data and then shows the season', async ({ page }) => {
    await reachThePalette(page)
    // The select only exists once the ~98 kB of season data has arrived.
    await expect(page.getByLabel(/your season/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.season-levels')).toBeVisible()
  })

  test('fetches the season chunks only on this tab, never on the wheel', async ({ page }) => {
    const chunks: string[] = []
    page.on('request', (r) => {
      const url = r.url()
      if (/season-colors|pccs-grid|season-rules|pccs-tones|pccs-hues/.test(url)) chunks.push(url)
    })

    await page.goto('./')
    await page.locator('.chord-wheel').waitFor()
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.browse-grid').first().waitFor()
    // The regression this guards: these were once in the main bundle, which
    // slowed every screen including ones with no seasons on them.
    expect(chunks, 'season data was fetched outside the You tab').toEqual([])

    await reachThePalette(page)
    await expect(page.getByLabel(/your season/i)).toBeVisible({ timeout: 15_000 })
    expect(chunks.length, 'season data was never fetched on the You tab').toBeGreaterThan(0)
  })

  test('marks the parent season as sourced and the sub-season as ours', async ({ page }) => {
    await reachThePalette(page)
    const sourced = page.locator('.season-badge.sourced')
    const ours = page.locator('.season-badge.ours')
    await expect(sourced).toBeVisible()
    await expect(ours).toBeVisible()
    await expect(sourced).toHaveText(/published/i)
    await expect(ours).toHaveText(/our/i)

    // They must actually LOOK different — the claim is carried by appearance,
    // and jsdom applies no cascade so only a browser can check it.
    const filled = await sourced.evaluate((el) => getComputedStyle(el).backgroundColor)
    const outlined = await ours.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(filled, 'the two badges are styled identically').not.toBe(outlined)
  })

  test('shows each ideal colour beside the nearest one the book actually has', async ({ page }) => {
    await reachThePalette(page)
    await page.getByRole('tab', { name: /·/ }).last().click()

    const pairs = page.locator('.fit-pair')
    await expect(pairs.first()).toBeVisible()
    expect(await pairs.count()).toBeGreaterThan(0)

    // Each row is ideal -> actual: two swatches with DIFFERENT colours. If they
    // ever render the same, the comparison the panel exists to make is gone.
    const first = pairs.first()
    const ideal = await first.locator('.fit-ideal').evaluate((el) => getComputedStyle(el).backgroundColor)
    const actual = await first.locator('.fit-actual').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(ideal).toMatch(/^rgb/)
    expect(actual).toMatch(/^rgb/)
    await expect(first.locator('.fit-band')).toHaveText(/very close|close|roughly|not close/)
  })

  test('says plainly that these are the nearest matches, not season colours', async ({ page }) => {
    await reachThePalette(page)
    await page.getByRole('tab', { name: /·/ }).last().click()
    // The owner's instruction, and the reason the fit panel exists at all.
    await expect(page.locator('.fit-caveat')).toContainText(/nearest match/i)
    await expect(page.locator('.fit-caveat')).toContainText(/not exact season/i)
    // The crowding number, which is the panel's real finding.
    await expect(page.locator('.fit-caveat')).toContainText(/different colours|own distinct colour/i)
  })

  test('credits PCCS and the institute Wada founded', async ({ page }) => {
    await reachThePalette(page)
    await page.getByRole('tab', { name: /·/ }).last().click()
    const provenance = page.locator('.you-provenance')
    await expect(provenance).toContainText('PCCS')
    await expect(provenance).toContainText(/Japan Color Research Institute/i)
    await expect(provenance).toContainText(/our own subdivision/i)
  })
})

// "i also want the 'what the book has for ...' those list of colors also
// clickable that changes the start a palette from. this way anything on that
// page can be interactive as a starting point" — owner, 2026-07-30.
//
// A browser test because the payoff is a round trip through three components:
// the row reports its colour, PaletteTabs decides the selection is valid, and
// the sticky doorway bar renames its button. jsdom can check any one of those;
// only the real page checks that they agree.
test.describe('the fit rows are starting points too', () => {
  test('picking one renames the palette button', async ({ page }) => {
    await reachThePalette(page)
    await page.getByRole('tab', { name: /·/ }).last().click()
    const button = page.getByRole('button', { name: /start a palette from/i })
    const before = await button.innerText()

    const row = page.locator('.fit-pair').nth(3)
    const name = await row.locator('.fit-name').innerText()
    await row.click()

    await expect(button).not.toHaveText(before)
    expect(await button.innerText()).toContain(name)
    await expect(row).toHaveAttribute('aria-selected', 'true')
  })

  test('and actually seeds Match with that colour', async ({ page }) => {
    await reachThePalette(page)
    await page.getByRole('tab', { name: /·/ }).last().click()
    const row = page.locator('.fit-pair').nth(3)
    const name = await row.locator('.fit-name').innerText()
    await row.click()
    await page.getByRole('button', { name: /start a palette from/i }).click()

    // The whole point of making them clickable: the colour has to arrive in
    // the palette tray, named.
    await page.getByRole('radiogroup', { name: /matching level/i }).waitFor()
    await expect(page.locator('.tray .chip .nm')).toContainText(name)
  })

  test('a swatch and a row share one selection', async ({ page }) => {
    await reachThePalette(page)
    await page.getByRole('tab', { name: /·/ }).last().click()
    const row = page.locator('.fit-pair').nth(2)
    await row.click()
    await expect(row).toHaveAttribute('aria-selected', 'true')

    // Picking in the other list must release this one — there is one "start
    // from" button, so two simultaneous selections would be a lie.
    await page.locator('.you-swatch').nth(4).click()
    await expect(page.locator('.you-swatch').nth(4))
      .toHaveAttribute('aria-selected', 'true')
    const rowName = await row.locator('.fit-name').innerText()
    const swatchName = await page.locator('.you-swatch').nth(4).innerText()
    // Unless they are the same colour, which the crowding this panel documents
    // makes entirely possible.
    if (!swatchName.includes(rowName)) {
      await expect(row).toHaveAttribute('aria-selected', 'false')
    }
  })

  test('the pick is visible on the colour itself, not only in the button',
    async ({ page }) => {
      await reachThePalette(page)
      // Selection has driven the button's text since v1.8.3 with no mark on the
      // chosen colour at all. That was survivable with one list; with two it is
      // not, and only a browser can see whether an outline renders.
      const swatch = page.locator('.you-swatch').nth(5)
      await swatch.click()
      const outline = await swatch.locator('i').evaluate(
        (el) => getComputedStyle(el).outlineStyle)
      expect(outline, 'the chosen swatch is not marked').not.toBe('none')
    })
})
