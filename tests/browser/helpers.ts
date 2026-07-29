import type { Page } from '@playwright/test'

// Colours from src/styles/tokens.css, as the browser reports them.
export const ACCENT = 'rgb(242, 101, 34)' // --accent #f26522
export const LINK = 'rgb(35, 97, 146)'    // --link   #236192

export async function openSampler(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: /sample a color/i }).first().click()
  await page.getByRole('dialog', { name: 'Sample a color' }).waitFor()
}

export async function openPicker(page: Page) {
  await openSampler(page)
  await page.getByRole('button', { name: /pick a color/i }).click()
  await page.getByRole('dialog', { name: 'Pick a color' }).waitFor()
}

export function computed(page: Page, selector: string, prop: string) {
  return page.evaluate(
    ([sel, p]) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error(`no element matches ${sel}`)
      return getComputedStyle(el).getPropertyValue(p)
    },
    [selector, prop] as const,
  )
}
