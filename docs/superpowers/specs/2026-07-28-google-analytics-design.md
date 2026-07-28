# Google Analytics — design

**Status:** approved (owner brainstorm, 2026-07-28)
**Feature:** Report visits from the published site to Google Analytics 4
(measurement ID `G-CHW8X8EX18`) — and only from the published site.

## Goal

The owner wants to know whether anyone is visiting the site. Google gave them
the standard gtag.js snippet. Add it to the deployed page without polluting the
property with the owner's own `make dev` sessions, and without quietly
undermining the privacy promises the site already makes about photos.

## Decisions (resolved during brainstorm)

1. **Production build only.** The tag is injected by `make build` — the artifact
   GitHub Pages serves. `make dev`, `make preview` of un-built source, and the
   test suite never load it. (Owner chose this over pasting the snippet into
   `index.html` as-is, which would have counted every local dev session as real
   traffic.)
2. **Disclosure lives in the README, not the UI.** A short Analytics section
   states that the published site loads GA and that it never receives photos or
   sampled colors. No footer line, no cookie banner. (Owner chose this over a
   visible in-page disclosure; the deferred alternatives are logged in
   `TODO.md`.)
3. **The measurement ID is a plain constant in `vite.config.ts`** — not an env
   var. It is public by nature, it never changes, and this repo deliberately has
   no environment-variable story to extend.

## Architecture

### The injection seam

An inline Vite plugin in `vite.config.ts`:

```
name: 'google-analytics'
apply: 'build'              // the gate: build-only, never dev/preview/test
transformIndexHtml(html)    // splice the snippet in before </head>
```

`index.html` is **not** modified. It stays the minimal dev-time entry point it
is today, which means the tag has exactly one source of truth and one place it
can be turned off.

`apply: 'build'` is the load-bearing line. Vite only registers the plugin for
the build command, so there is no runtime branch to get wrong — the dev server
never has the plugin in its pipeline at all.

### Why not the alternatives

- **Paste into `index.html`** — simplest, but fires on every `make dev`, which
  is exactly what decision 1 rules out.
- **`.env` + `import.meta.env.VITE_GA_ID`** — introduces environment-variable
  plumbing (a `.env` file, a `.env.example`, a README section, a CI secret that
  isn't secret) for a public constant that never changes. YAGNI.
- **A React `useEffect` that appends the script** — puts an analytics concern
  inside the component tree, where the privacy source-scan tests live and where
  it would run in jsdom tests. The HTML seam keeps it out of `src/` entirely.

### Relationship to the existing privacy guarantees

The sampler's promise — uploaded photos and camera frames never leave the
device — is **unchanged and still true**. GA sees page views, not pixels.

`tests/sample-privacy.test.ts` and `tests/camera-privacy.test.ts` scan
`src/components/sample/` and `src/components/camera/` for network and storage
APIs. Nothing in `src/` changes here, so both guards stay green **and stay
exactly as strict as they are today**. Neither is weakened, and the injected
snippet is deliberately kept out of `src/` partly so that stays true.

## Testing

New `tests/analytics.test.ts` imports the Vite config, locates the plugin by
name, and asserts:

1. `apply === 'build'` — the regression guard. If someone later drops this
   line, local dev traffic silently starts reporting; this test fails instead.
2. `transformIndexHtml` on a fixture emits the tag **inside `<head>`**.
3. The emitted measurement ID is exactly `G-CHW8X8EX18` — catches a typo'd or
   swapped property, which is otherwise invisible until the dashboard stays at
   zero.

Manual verification before the work is called done:

- `make test` and `make build` both green.
- `dist/index.html` contains `G-CHW8X8EX18`.
- The dev server's served HTML does **not**.

## Dependencies

**No new dependency.** `transformIndexHtml` is core Vite, which is already a dev
dependency. The runtime budget (react, react-dom, d3, culori) is untouched.

## Documentation (the CLAUDE.md contract)

- `README.md` — new **Analytics** section near Deployment. The "stays on your
  device" line in *Sample a color* is left exactly as written; it is still true.
- `PROMPTS.md` — the owner's prompt verbatim plus the two decisions above.
- `CHANGELOG.md` — release entry paired with the owner's prompt.
- `TODO.md` — the deferred alternatives: a visible in-page disclosure line, and
  a cookie-consent banner (only worth doing if EU visitors start to matter).
- `Makefile` — unchanged; this adds no commands.

## Out of scope

- **Custom events.** No tracking of wheel clicks, palette builds, or exports.
  Page views only, until the owner asks for a specific question to be answered.
- **Consent management.** No cookie banner. Logged in `TODO.md` as a deliberate
  deferral rather than an oversight.
- **Any second analytics provider.**

## Version

Ships as **v1.3.3** — a patch. Nothing the visitor sees or interacts with
changes; the site's behavior for a user is identical.
