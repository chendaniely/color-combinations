import { expect, test } from '@playwright/test'

// Does the site sit still when nobody is touching it?
//
// The You tab did not. An inline callback in the deps of an effect that called
// it with a freshly built Set closed a render loop, and the tab burned a full
// CPU core for as long as it was open, re-ranking all 338 combinations on every
// pass. Measured 2026-07-30: 2.99s of script time in a 3s idle window, against
// 0.000s everywhere else.
//
// It shipped and survived a full review because it is INVISIBLE by every route
// the suite had: React only logs "Maximum update depth exceeded" in dev, so the
// console spec sees nothing in a production build; the output is correct, so no
// assertion about rendering fails; and it costs nothing a human notices on a
// fast desktop beyond ~90ms of click latency. On a phone it is battery.
//
// A browser test by necessity — this needs a real engine's task accounting, via
// CDP. The threshold is deliberately loose: an idle page should be doing
// essentially nothing, and anything approaching a whole core is the bug class
// this guards, not a slow render.
const IDLE_MS = 2000
const BUDGET_S = 0.4

for (const [name, url, ready] of [
  ['the wheel', './', '.chord-wheel'],
  ['Browse', './#/browse', '.browse-grid'],
  ['the You tab', './#/you?season=deep-autumn', '.fit-pair'],
] as const) {
  test(`${name} is idle when left alone`, async ({ page }) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Performance.enable')
    await page.goto(url)
    await page.locator(ready).first().waitFor({ timeout: 30_000 })
    await page.waitForTimeout(500)

    const read = async () => (await cdp.send('Performance.getMetrics')).metrics
    const before = await read()
    await page.waitForTimeout(IDLE_MS)
    const after = await read()
    const script = after.find((m) => m.name === 'ScriptDuration')!.value
      - before.find((m) => m.name === 'ScriptDuration')!.value

    expect(script, `${name} burns script time while idle`).toBeLessThan(BUDGET_S)
  })
}
