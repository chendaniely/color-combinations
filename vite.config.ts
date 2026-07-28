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
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
