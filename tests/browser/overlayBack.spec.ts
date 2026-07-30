import { expect, test } from '@playwright/test'
import { syntheticPortrait } from './makePng'

// Back dismisses a full-screen overlay instead of leaving the site.
//
// Owner, 2026-07-30: "clicking back on sample should close that drop down,
// right now back actually goes back on the URL. so i will kick myself out of
// the site."
//
// Browser-only by definition: this is the history stack, which jsdom does not
// implement. It is also the third attempt at the feature — see
// src/overlayHistory.ts — so the two ways the earlier ones failed each get a
// test of their own below.
test.describe('Back closes an overlay', () => {
  test('and does not leave the site, even as the first thing you do',
    async ({ page }) => {
      await page.goto('./')
      await page.locator('.chord-wheel').waitFor()
      const url = page.url()

      await page.locator('.search-sample').click()
      await expect(page.getByRole('dialog', { name: /sample a color/i })).toBeVisible()

      await page.goBack()

      // The whole complaint: on a fresh load there is nothing behind the
      // overlay, so without a pushed entry Back leaves the site entirely.
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.locator('.chord-wheel')).toBeVisible()
      expect(page.url()).toBe(url)
    })

  test('and the address bar never advertises the overlay', async ({ page }) => {
    await page.goto('./')
    await page.locator('.chord-wheel').waitFor()
    const url = page.url()
    await page.locator('.search-sample').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // A half-finished capture is not a place, and must not be shareable.
    expect(page.url()).toBe(url)
  })

  test('closing with the button leaves no dead history entry', async ({ page }) => {
    // How attempt 2 failed: the marker survived the close, so the next Back
    // landed on an identical URL and visibly did nothing.
    await page.goto('./')
    await page.locator('.chord-wheel').waitFor()
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.browse-filters').waitFor()

    await page.locator('.search-sample').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /^close$/i }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // One Back should now go back a real step, to the wheel.
    await page.goBack()
    await expect(page.locator('.chord-wheel')).toBeVisible()
  })

  test('survives the capture handoff, which unmounts one overlay into the next',
    async ({ page }) => {
      // How attempt 1 failed: FaceCapture unmounts straight into ProbeReview,
      // and an async pop queued by the first landed after the second had
      // pushed, closing the review screen the instant it opened.
      await page.goto('./')
      await page.getByRole('button', { name: 'You' }).first().click()
      await page.getByRole('button', { name: /photograph|take a photo|start/i }).first().click()
      await page.getByRole('dialog', { name: 'Photograph your face' }).waitFor()

      const upload = page.getByRole('tab', { name: /upload a photo/i })
      if (await upload.count()) await upload.click()
      await page.getByLabel('Choose a photo').setInputFiles({
        name: 'portrait.png', mimeType: 'image/png', buffer: syntheticPortrait(),
      })

      // The review screen must open AND STAY open.
      const review = page.getByRole('dialog', { name: 'Check what we read' })
      await review.waitFor({ timeout: 30_000 })
      await page.waitForTimeout(600)
      await expect(review).toBeVisible()

      // And Back still dismisses it rather than leaving the tab.
      await page.goBack()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.locator('.you-view')).toBeVisible()
    })

  test('Back from a capture screen returns to the tab it opened from',
    async ({ page }) => {
      // Named for what it does. It read "choosing something inside the overlay
      // still navigates" and chose nothing — it presses Back with the picker
      // still open. The choosing path is a different thing entirely and is
      // pinned separately below.
      await page.goto('./')
      await page.getByRole('button', { name: 'Match' }).first().click()
      await page.getByRole('radiogroup', { name: /matching level/i }).waitFor()
      await page.getByRole('radio', { name: /^colors?$/i }).click()
      await page.locator('.match-entry').waitFor()

      await page.getByRole('button', { name: /pick a color/i }).click()
      await expect(page.getByRole('dialog', { name: /pick a color/i })).toBeVisible()
      await page.goBack()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      // Still on Match, not thrown back to the wheel.
      await expect(page.getByRole('radiogroup', { name: /matching level/i })).toBeVisible()
    })

  // WHAT HAPPENS WHEN YOU CHOOSE A DESTINATION, pinned as it stands rather than
  // as it should be. The owner has seen it and wants it changed later:
  //
  //   "we can document that nuance with the pick a color match match back
  //    behaviour. and deal with that later. i think ideally it just goes back
  //    to the previous page, instead of dropping back to the main page"
  //
  // Measured 2026-07-30 on the route below: Back lands on the WHEEL, because
  // the sampler's own steps (cards, picker, nearest colours) are not in history
  // — one entry covers the whole task, and choosing a destination turns that
  // entry into the destination. So Back skips the task entirely and returns to
  // whatever preceded it.
  //
  // The test exists so that fixing it shows up as a deliberate diff here rather
  // than as a silent behaviour change. See TODO.md for what a fix involves.
  test('choosing a destination currently skips the whole task on Back',
    async ({ page }) => {
      await page.goto('./')
      await page.locator('.chord-wheel').waitFor()
      const wheelUrl = page.url()

      await page.locator('.search-sample').click()
      await page.getByRole('button', { name: /pick a color/i }).click()
      await page.getByRole('button', { name: /explore this color/i }).click()
      await page.getByRole('dialog').first().locator('button').nth(1).click()
      await page.getByRole('button', { name: /^Match /i }).first().click()

      await expect(page.locator('.match-view')).toBeVisible()
      expect(page.url()).toContain('#/match')

      await page.goBack()
      // TODAY: the wheel. WANTED: the sampler, showing its nearest colours.
      await expect(page.locator('.chord-wheel')).toBeVisible()
      expect(page.url()).toBe(wheelUrl)
    })
})
