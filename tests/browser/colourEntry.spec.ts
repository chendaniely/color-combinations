import { expect, test } from '@playwright/test'

// Match > Colors was a DEAD END, and the camera hid behind a pencil.
//
// Browser tests because both complaints are about what a visitor can SEE and
// reach: "the options under the pencil aren't that visable to the user", and
// "on its own there's no way to get to a similar page". jsdom can tell you the
// markup exists; only a browser can walk the route.

async function matchColors(page: import('@playwright/test').Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Match' }).first().click()
  await page.getByRole('radiogroup', { name: /matching level/i }).waitFor()
  await page.getByRole('radio', { name: /^colors?$/i }).click()
  await page.locator('.match-entry').waitFor()
}

test.describe('Match > Colors is no longer a dead end', () => {
  test('offers real ways in rather than a sentence about elsewhere', async ({ page }) => {
    await matchColors(page)
    // It used to say "Search a color name above, or snap a color with the
    // camera", which points at affordances on other parts of the page.
    await expect(page.locator('.match-entry .sample-src')).not.toHaveCount(0)
    for (const name of [/search by name/i, /upload a photo/i, /pick a color/i]) {
      await expect(page.getByRole('button', { name })).toBeVisible()
    }
  })

  test('a card opens its capture screen directly, skipping the overlay menu',
    async ({ page }) => {
      await matchColors(page)
      await page.getByRole('button', { name: /pick a color/i }).click()
      // Straight into the picker — the cards on the page already asked the
      // question the overlay's own card list would ask again.
      await expect(page.getByRole('dialog', { name: /pick a color/i })).toBeVisible()
    })

  test('upload opens the image picker', async ({ page }) => {
    await matchColors(page)
    await page.getByRole('button', { name: /upload a photo/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('the search card points at the header box rather than duplicating it',
    async ({ page }) => {
      await matchColors(page)
      await page.getByRole('button', { name: /search by name/i }).click()
      // No second search input anywhere; the real one takes focus.
      await expect(page.getByRole('dialog')).toHaveCount(0)
      const focused = await page.evaluate(() =>
        document.activeElement?.getAttribute('aria-label'))
      expect(focused).toMatch(/search/i)
    })

  test('the level did not change underneath the visitor', async ({ page }) => {
    await matchColors(page)
    await expect(page.getByRole('radio', { name: /^colors?$/i }))
      .toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('the sample button says what it is', () => {
  test('carries a camera and a visible label, not a bare pencil', async ({ page }) => {
    await page.goto('./')
    const button = page.locator('.search-sample')
    await expect(button).toBeVisible()
    // The label is what makes it discoverable; a bare icon is not, whichever
    // glyph it carries.
    await expect(button).toContainText(/sample/i)
    // The label AND the drawing.
    //
    // This asserted only `[data-icon="camera"]` for a while, on the reasoning
    // that intent beats artwork. A reviewer showed that is too weak: the
    // attribute is written by hand here, so importing `Pencil as Camera`
    // renders a pencil and the test named "not a bare pencil" passes. So also
    // compare the rendered path against the gallery's camera card, which comes
    // from the same import — swap one and they diverge.
    // (The glyph's identity against the LIBRARY is checked in the fast suite,
    // in tests/colorEntry.test.tsx, where it costs no browser.)
    await expect(button.locator('[data-icon="camera"]')).toHaveCount(1)
    const headerPath = await button.locator('svg path').first().getAttribute('d')

    await button.click()
    await page.getByRole('dialog', { name: /sample a color/i }).waitFor()
    const cardPath = await page
      .getByRole('button', { name: /^camera/i }).locator('svg path').first()
      .getAttribute('d')
    expect(headerPath, 'the header icon is not the camera the cards use')
      .toBe(cardPath)
  })

  test('still opens the same gallery, with the camera offered there too',
    async ({ page }) => {
      await page.goto('./')
      await page.locator('.search-sample').click()
      await expect(page.getByRole('dialog', { name: /sample a color/i })).toBeVisible()
      // Same component as Match > Colors, so the cards match.
      await expect(page.getByRole('button', { name: /upload a photo/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /pick a color/i })).toBeVisible()
    })
})
