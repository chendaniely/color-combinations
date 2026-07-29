import { expect, test } from '@playwright/test'

// End-to-end journeys through the sampler. ColorSampler is the last sizeable
// piece of routing with almost no coverage (9% of functions in the fast suite)
// because it is a shell: it picks a source, hands one RGB to ColorMatches, and
// hands the result to Match or Browse. Mocking that in jsdom would test the
// mock. Walking it in a browser tests the thing.

async function pickNycBlue(page: import('@playwright/test').Page) {
  await page.goto('./')
  await page.getByRole('button', { name: /sample a color/i }).first().click()
  await page.getByRole('button', { name: /pick a color/i }).click()
  await page.getByRole('dialog', { name: 'Pick a color' }).waitFor()
  await page.getByRole('button', { name: /explore this color/i }).click()
  await page.getByRole('dialog', { name: 'Nearest colors' }).waitFor()
}

test.describe('sample a colour, then do something with it', () => {
  test('offers book colours near the one picked', async ({ page }) => {
    await pickNycBlue(page)
    // The picker opens seeded on the owner's NYC blue (#236192).
    await expect(page.getByText('#236192')).toBeVisible()
    const options = page.getByRole('option')
    await expect(options.first()).toBeVisible()
    expect(await options.count()).toBeGreaterThan(1)
    // Each result is named and rated for closeness.
    await expect(page.locator('.match-lab').first()).toHaveText(/close|roughly/i)
  })

  test('hands the chosen colour to Match and lands with a palette started', async ({ page }) => {
    await pickNycBlue(page)
    await page.getByRole('button', { name: /^Match / }).click()

    // The overlay closes and Match is showing, seeded rather than empty.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Build a palette' })).toBeVisible()
    await expect(page.locator('.tray .chip').first()).toBeVisible()
  })

  test('hands the chosen colour to Browse and lands filtered', async ({ page }) => {
    await pickNycBlue(page)
    await page.getByRole('button', { name: /^Browse / }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.browse-grid').first()).toBeVisible()
    // Filtered, not the full 338.
    const count = await page.locator('.filter-row .muted, .browse-view .muted').first().innerText()
    expect(count).toMatch(/\d+ combination/)
    expect(count).not.toMatch(/^338 /)
  })

  test('the level switch changes what gets handed over', async ({ page }) => {
    await pickNycBlue(page)
    // Scoped to the dialog: the wheel's granularity buttons behind it are also
    // role="radio". They are correctly inert under a modal <dialog>, so an
    // unscoped locator resolves to something that can never be clicked.
    const radios = page.getByRole('dialog').getByRole('radio')
    // Default is Shade; the CTA names whatever the level resolves to.
    const shadeCta = await page.getByRole('button', { name: /^Match / }).innerText()
    await radios.first().click() // Colour
    const colourCta = await page.getByRole('button', { name: /^Match / }).innerText()
    expect(colourCta).not.toBe(shadeCta)
  })

  test('back returns to the source list without losing the overlay', async ({ page }) => {
    await pickNycBlue(page)
    await page.getByRole('button', { name: /sample another color/i }).click()
    await expect(page.getByRole('dialog', { name: 'Sample a color' })).toBeVisible()
  })
})
