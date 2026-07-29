import { defineConfig, devices } from '@playwright/test'

// The real-browser suite. It exists because jsdom performs no layout and
// applies no cascade, so an entire class of user-visible defect shipped past a
// green unit suite -- five of them, all logic-correct, every one found only by
// opening a browser. See tests/browser/regressions.spec.ts for the list.
//
// It is deliberately NOT part of `make test`. The fast suite stays fast
// (~7s, no browser); this runs on `make test-browser`, and needs a one-time
// `npx playwright install chromium` (see README).
//
// It tests the BUILT site rather than the dev server, so the production
// cascade -- minified, bundled, with the real base path -- is what gets
// asserted. A defect that only appears after bundling would otherwise hide.
const PORT = 4173
const BASE = `http://localhost:${PORT}/color-combinations/`

export default defineConfig({
  testDir: 'tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
