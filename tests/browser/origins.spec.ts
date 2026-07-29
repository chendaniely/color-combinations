import { expect, test } from '@playwright/test'
import { syntheticPortrait } from './makePng'

// Enforces CLAUDE.md dependency property 3 — "nothing user-derived leaves the
// device; any asset must be self-hosted from our own origin" — by watching what
// the real page actually requests, rather than by grepping source for URLs.
//
// The one documented exception is Google Analytics (v1.3.3, an explicit owner
// decision). Everything else must come from our own origin: fonts, the D3
// bundle, the colour data, and above all the 3.5 MB MediaPipe face model, which
// tests/facePrivacy.test.ts already forbids from carrying an absolute URL.
//
// A static scan cannot prove this. A CDN font pulled in by a stylesheet, or a
// library that phones home at runtime, would slip past a grep and show up here.
const ANALYTICS = ['www.googletagmanager.com', 'www.google-analytics.com', 'region1.google-analytics.com']

function collectOrigins(page: import('@playwright/test').Page) {
  const seen = new Set<string>()
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.protocol === 'data:' || url.protocol === 'blob:') return
    seen.add(url.host)
  })
  return seen
}

test('the page contacts nobody but us and the analytics we declared', async ({ page }) => {
  const origins = collectOrigins(page)

  await page.goto('./')
  for (const view of ['Match', 'Browse', 'You', 'About', 'Wheel']) {
    await page.getByRole('button', { name: view }).first().click()
    const close = page.locator('.panel-close')
    if (await close.count()) await close.first().click()
  }

  const foreign = [...origins].filter(
    (h) => !h.startsWith('localhost') && !ANALYTICS.includes(h))
  expect(foreign, 'unexpected third-party origins contacted').toEqual([])
})

// The face model is the biggest asset the site owns and the most tempting to
// serve from someone else's CDN. This proves it comes from us.
test('the face detector loads entirely from our own origin', async ({ page }) => {
  const origins = collectOrigins(page)
  const mediapipe: string[] = []
  page.on('request', (req) => {
    if (/mediapipe|tflite|wasm/i.test(req.url())) mediapipe.push(req.url())
  })

  await page.goto('./')
  await page.getByRole('button', { name: 'You' }).first().click()
  await page.getByRole('button', { name: /photograph|take a photo|start/i }).first().click()
  await page.getByRole('dialog', { name: 'Photograph your face' }).waitFor()
  const upload = page.getByRole('tab', { name: /upload a photo/i })
  if (await upload.count()) await upload.click()
  await page.getByLabel('Choose a photo').setInputFiles({
    name: 'p.png', mimeType: 'image/png', buffer: syntheticPortrait(),
  })
  await page.getByRole('dialog', { name: 'Check what we read' }).waitFor({ timeout: 20_000 })

  // It really did load the model, so this cannot pass by never running.
  expect(mediapipe.length, 'no model assets were requested at all').toBeGreaterThan(0)
  for (const url of mediapipe) {
    expect(new URL(url).host, `${url} is not served by us`).toContain('localhost')
  }

  const foreign = [...origins].filter(
    (h) => !h.startsWith('localhost') && !ANALYTICS.includes(h))
  expect(foreign, 'the You tab contacted a third party').toEqual([])
})
