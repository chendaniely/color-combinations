import { expect, test } from '@playwright/test'
import { openPicker, openSampler } from './helpers'

// The behaviour that motivated Overlay.tsx. None of it can be asserted in
// jsdom, which implements <dialog> as an element with no modal semantics at
// all -- tests/setup.ts polyfills only the `open` flag, on purpose, because a
// passing assertion against a faked focus trap would mean nothing.
test.describe('modal overlays behave like modals', () => {
  test('Escape dismisses, which the hand-rolled divs never did', async ({ page }) => {
    await openPicker(page)
    const picker = page.getByRole('dialog', { name: 'Pick a color' })
    await expect(picker).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(picker).toBeHidden()
  })

  test('focus cannot Tab out into the page behind', async ({ page }) => {
    await openPicker(page)

    // Walk well past the number of focusable controls in the dialog (there are
    // seven). With the old <div role="dialog"> this escaped into the header and
    // the search box after the last one.
    //
    // Landing on <body> once per cycle is Chromium's wrap point, not a leak —
    // in a headed browser that step is the address bar. So the assertion is
    // that focus never reaches a CONTROL outside the dialog, which is the thing
    // that actually harms a keyboard user.
    const visited = new Set<string>()
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      const where = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return 'body'
        return el.closest('dialog') ? 'dialog' : `LEAKED:${el.tagName}.${el.className}`
      })
      visited.add(where)
      expect(where, `focus escaped the dialog after ${i + 1} tabs`).not.toContain('LEAKED')
    }
    // Sanity: the walk really did move through the dialog's controls.
    expect(visited.has('dialog')).toBe(true)
  })

  test('the page behind is inert, not merely covered', async ({ page }) => {
    await openSampler(page)
    // A modal <dialog> makes everything outside it inert. Querying the search
    // input behind the overlay and trying to focus it must not take focus.
    const tookFocus = await page.evaluate(() => {
      const behind = document.querySelector('.search-box input') as HTMLInputElement | null
      if (!behind) return 'no input found'
      behind.focus()
      return document.activeElement === behind
    })
    expect(tookFocus).toBe(false)
  })

  test('the overlay is a real dialog element, opened modally', async ({ page }) => {
    await openSampler(page)
    const info = await page.evaluate(() => {
      const d = document.querySelector('dialog')
      return { tag: d?.tagName ?? null, open: (d as HTMLDialogElement)?.open ?? null,
               parent: d?.parentElement?.tagName ?? null }
    })
    expect(info.tag).toBe('DIALOG')
    expect(info.open).toBe(true)
    // Portalled out of .search-box — the fix for the cascade trap.
    expect(info.parent).toBe('BODY')
  })

  test('the UA default dialog box is fully neutralised', async ({ page }) => {
    await openSampler(page)
    const box = await page.evaluate(() => {
      const d = document.querySelector('dialog')!
      const s = getComputedStyle(d)
      return { maxWidth: s.maxWidth, maxHeight: s.maxHeight, borderStyle: s.borderTopStyle,
               width: d.getBoundingClientRect().width }
    })
    expect(box.maxWidth).toBe('none')
    expect(box.maxHeight).toBe('none')
    expect(box.borderStyle).toBe('none')
    // Fills the viewport rather than shrinking to the UA's fit-content box.
    expect(box.width).toBeGreaterThan(1000)
  })
})

// Focus management, which jsdom can only half-check: it verifies that Overlay
// CALLS focus(), while only a real browser runs showModal()'s own focus
// behaviour that ours has to override.
test.describe('focus goes somewhere sensible, and comes back', () => {
  test('lands on the dialog itself rather than on its Close button', async ({ page }) => {
    await openPicker(page)
    await expect(page.getByRole('dialog', { name: 'Pick a color' })).toBeVisible()

    // showModal()'s own default is the first tabbable child — the × — so the
    // first thing announced would be "Close". Overlay overrides that.
    const focused = await page.evaluate(() => ({
      tag: document.activeElement?.tagName ?? null,
      label: document.activeElement?.getAttribute('aria-label') ?? null,
    }))
    expect(focused.tag).toBe('DIALOG')
    expect(focused.label).toBe('Pick a color')
  })

  test('returns to the control that opened it when dismissed', async ({ page }) => {
    await openSampler(page)
    // Remember what the browser considers focused before opening the picker.
    const before = await page.evaluate(() =>
      document.activeElement?.getAttribute('aria-label')
      ?? document.activeElement?.textContent?.trim() ?? null)

    await openPicker(page)
    await expect(page.getByRole('dialog', { name: 'Pick a color' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Pick a color' })).toBeHidden()

    // The defect: focus fell to the top of <body>, so a keyboard user had to
    // Tab through the whole header to get back to where they were.
    const after = await page.evaluate(() => ({
      isBody: document.activeElement === document.body,
      name: document.activeElement?.getAttribute('aria-label')
        ?? document.activeElement?.textContent?.trim() ?? null,
    }))
    expect(after.isBody, 'focus was dropped on <body> instead of restored').toBe(false)
    if (before) expect(after.name).toBe(before)
  })
})
