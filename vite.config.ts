/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Google Analytics 4 property for the published site. Public by nature — it
// ships in the page source — so it's a constant here rather than a .env var.
export const GA_MEASUREMENT_ID = 'G-CHW8X8EX18'

const GA_TAG = `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${GA_MEASUREMENT_ID}');
    </script>
`

export default defineConfig({
  plugins: [
    react(),
    {
      // Injected into the built page only: `apply: 'build'` keeps the tag out
      // of `make dev` and the tests, so local sessions never report as real
      // traffic. Guarded by tests/analytics.test.ts — don't drop that line.
      name: 'google-analytics',
      apply: 'build',
      // Swallow the whitespace before </head> so the tag lands correctly
      // indented after whatever Vite has already injected there.
      transformIndexHtml: (html: string) => html.replace(/\s*<\/head>/, `\n${GA_TAG}  </head>`),
    },
  ],
  base: '/color-combinations/',
  test: {
    environment: 'node',
    // tests/browser/ is Playwright's (see `make test-browser`); it drives a real
    // browser and must not be collected by the fast jsdom/node suite.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/browser/**'],
    setupFiles: ['tests/setup.ts'],
    // Vitest's default is 5000ms, tuned for unit tests. Several files here
    // render the WHOLE book in jsdom on purpose — MatchedCombinations ranks all
    // 348 combinations, PaletteTabs scores all 157 colours — because asserting
    // against the real dataset is the point of those tests, and shrinking the
    // fixture would weaken them.
    //
    // This closes the "UNDIAGNOSED: one test failed once" entry that sat in
    // TODO.md since v1.4.0. It reproduced twice on 2026-07-29, both times as
    // `matchedCombinations > the floor control > offers all four stops`, and
    // both times as a TIMEOUT rather than a failed assertion: 7122ms against
    // the 5000ms limit, in a run where its own siblings took 200-900ms and the
    // suite spent 60s of test time across workers. It is the first test in a
    // heavy file, so it also pays module init and first render. Under parallel
    // worker contention that crosses 5s. Nothing is hung; the work is real.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
