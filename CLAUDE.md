# CLAUDE.md — working rules for this repo

This project is **fully vibe-coded**: the owner does not read
JavaScript/HTML/CSS. You (Claude) are the only maintainer. These rules are
non-negotiable.

## The documentation contract

**Wrong documentation is worse than no documentation.** Any change that
affects setup, commands, structure, or behavior MUST update the affected
docs in the SAME commit:

- `README.md` — what the site is + complete setup/run/deploy instructions,
  written for a non-JS reader. Never document a command that doesn't work.
- `Makefile` — must always match reality; every target works.
- `PROMPTS.md` — append-only log of the owner's prompts and decisions.
  **Every session: append the owner's prompts (verbatim) and the choices
  they made.** Someone should be able to re-create this site from it.
- `TODO.md` — ideas/items deliberately deferred. Add anything skipped.
- `TODO-completed.md` — move items here when done, WITH the commit hash
  that completed them.
- `CHANGELOG.md` — user-facing release history. **On every release, add a
  top entry that pairs what changed with the owner's guiding prompt(s),
  quoted verbatim from `PROMPTS.md`.** The point of this file is to show
  that the project is human-guided, not blindly vibe-coded — keep that
  framing; don't reduce it to a bare list of changes.
- The spec (`docs/superpowers/specs/`) — update if the design changes.

**Specs are living; plans and PROMPTS.md are history.** This was implicit
and bit us: the v1.0 spec still claimed plate proportions meant "dominant
garment vs accent", six releases after that turned out to be false, and
still called the granularity control a "slider" when it was built as a
radiogroup. Both were corrected in v1.6.0.

The way to correct a dated spec is a **dated correction block at the
top**, not a rewrite — the document records what was decided on a day,
and silently editing it destroys that while pretending nothing happened.
See the top of `2026-07-19-color-combinations-explorer-design.md`.

`docs/superpowers/plans/` and `PROMPTS.md` are NOT maintained. They are
what was done and said at the time; several plans name symbols that no
longer exist (`readableTextOn`, `TAPER`, `RADIUS`). Do not "fix" them.
Never treat a plan as a description of the current code.

## Architecture rules (see spec for rationale)

- `src/core/` is a **pure TypeScript kernel**: only relative imports of
  other core files; no React, D3, or browser globals. Enforced by
  `tests/core-purity.test.ts` — never weaken that test.
- The app reads exactly two data files, both schema-versioned and validated
  at load by `src/data.ts` — the ONLY module allowed to import a data file.
  The word *import* is load-bearing: an `import` bundles the file into the
  app, which is why exactly one module may do it. Tests may read the same
  files with `readFileSync` (several do, to assert against the real book)
  because that runs in Node and bundles nothing. Never convert such a read
  into an import to make a test tidier.
  - `data/processed/colors-data.json` is **generated** from a vendored
    source and must never be hand-edited. Source-format knowledge lives
    ONLY in `scripts/ingest/`.
  - `data/curated/seasons.json` is **authored by hand** and never
    generated. `scripts/seed-seasons.ts` produced the first version and is
    not part of the build; re-running it overwrites curation. It holds the
    twelve season→color palettes, which have no published source and are
    ours — kept as data precisely so they can be audited and corrected
    without touching TypeScript.
- App state is one serializable object (`src/core/state.ts`).
- Every design token (color/font/spacing/motion) lives in
  `src/styles/tokens.css`. No hard-coded colors in components, with exactly
  two exemptions, both because the colour IS the content rather than a
  style choice:
  1. **Sanzo Wada's data colours** — the book's own hex values.
  2. **Colour-space renderings** — the hue stops and saturation wash of the
     picker disc (`.pick-face` in `app.css`) and the wheel's ribbon fills.
     A hue wheel cannot be drawn in tokens; it has to be actual hues.
  Exemption 2 was previously claimed by a comment in `app.css` citing a rule
  that only granted exemption 1. If a third exemption ever seems necessary,
  the honest move is to add it here, not to cite this rule for something it
  does not say.
- All D3 code stays in `src/viz/`.
- Pure `parseHex` (color string parsing) lives in `src/core/colorMath.ts`;
  browser components that sample colors live in `src/components/sample/`
  (camera-only pieces stay in `src/components/camera/`), guarded by
  `tests/sample-privacy.test.ts` against network/storage APIs.
- Analytics lives ONLY in the `google-analytics` plugin in `vite.config.ts`,
  injected at build time (`apply: 'build'`) so `make dev` never reports as
  real traffic. Never move the tag into `index.html` (it would fire in dev)
  or into `src/` (it would sit next to the privacy-guarded sampler).
  `tests/analytics.test.ts` enforces the build-only gate — don't weaken it.
- **Every full-screen overlay goes through `src/components/Overlay.tsx`.**
  It is a native `<dialog>` opened with `showModal()` and portalled to
  `<body>`. Never hand-roll `<div role="dialog">` again: that shipped seven
  times with no focus trap, no Escape and no `aria-modal`. The portal is
  also load-bearing, not tidiness — it removes the `.search-box` ancestor
  whose `.search-box input` rule (0,1,1) outranked overlay styles and
  caused real visual defects. jsdom has no `showModal`, so `tests/setup.ts`
  polyfills only the `open` flag; the modal behaviour is asserted in
  `tests/browser/overlay.spec.ts`.
- Values shared by two renderers live in one module, never two copies:
  `src/plateLayout.ts` (the plate taper, used by `PlateCard` and
  `exportPng`), `--pick-disc-size` (the colour disc, whose pin is placed
  in percentages so TypeScript holds no copy of the size).

## Dependency rules

This used to be a whitelist of four packages. The owner reopened it in
v1.5.0 — *"the original constraight was to make it so the app runs and
launches easily, but i may have been tto strict in my words"* — and the
audit found the real constraint was never the package count. It is these
four properties. **A new dependency is allowed if and only if it keeps all
four true.**

1. **Builds to static files.** No server, no API, no request-time work.
   GitHub Pages serves the output as-is.
2. **`make install && make dev` just works.** npm only — no native
   compilation, no Python, no separate download step. Anything npm won't
   deliver gets vendored into the repo (see `data/raw/`,
   `vendor/mediapipe/`).
   Scope note (v1.6.0): this promise covers **running the site** —
   `make install`, `make dev`, `make build`, `make test`. It does NOT
   cover `make test-browser`, which needs a one-time
   `make install-browser` to fetch a private Chromium (~95 MB). The owner
   chose that explicitly, taking reproducibility over install weight, so
   that layout results are identical on every machine and in CI. The rule
   stands for everything a contributor needs in order to run or ship the
   site; a browser for the layout suite is an opt-in extra, and
   `make test` must never come to depend on it.
3. **Nothing user-derived leaves the device.** Any asset must be
   self-hosted from our own origin. A third-party CDN request is a leak
   even when it carries no payload, because it reveals that the visitor is
   on this page.
   **The one exception is Google Analytics**, added in v1.3.3 as an
   explicit owner decision and documented in the README's Analytics
   section. It is the ONLY third-party origin the site may contact, and
   the exception does not extend to assets: no CDN fonts, no CDN scripts,
   no remotely-hosted models. Stated here because the rule above reads as
   absolute, and a rule that is knowingly broken without saying so teaches
   the next reader that the rules are decorative.
   `tests/browser/origins.spec.ts` enforces this by watching every request
   the real page makes — a static scan cannot see a font pulled in by a
   stylesheet, or a library that phones home at runtime.
4. **Weight is paid by the feature that incurs it.** Anything large must
   lazy-load on entering its tab, never in the main bundle.

Runtime: react, react-dom, d3, culori, @mediapipe/tasks-vision. Dev: vite,
typescript, vitest, @vitejs/plugin-react, tsx, @types/react,
@types/react-dom, @types/d3, @types/node, jsdom, @testing-library/react,
@testing-library/dom, @playwright/test, oxlint, @vitest/coverage-v8,
@axe-core/playwright, axe-core.

Justifications: tsx = run TypeScript scripts under Node (ingest, season
seeding); @vitejs/plugin-react = Vite's React glue; @types/* = TypeScript
definitions; culori = perceptual color math (OKLab / ΔE / Lab) so we don't
hand-roll color science — used ONLY in `src/color/`, never in the pure
`src/core/` kernel; jsdom + @testing-library/* = unit-test DOM interaction;
@playwright/test = the real-browser suite (see Testing below); oxlint =
the linter (`make lint`, one package, config in `.oxlintrc.json`);
@vitest/coverage-v8 = `make coverage`, which answers "what do the tests
never run?"; @axe-core/playwright = the WCAG audit in
`tests/browser/a11y.spec.ts` — non-negotiable for a site that ships
accessibility goggles;
@mediapipe/tasks-vision = on-device face detection for the You tab,
Apache-2.0 with zero transitive dependencies, ~3.5 MB lazy-loaded and
self-hosted from `public/mediapipe/`.

## Testing: two suites, and why

`make test` (vitest + jsdom, ~600 checks, seconds) proves the site
*computes* the right answer. jsdom does no layout and applies no cascade,
so it structurally CANNOT see fonts, colours, sizes or positions.

`make test-browser` (Playwright + Chromium, `tests/browser/`) drives the
BUILT site and asserts what only a browser knows. It exists because five
user-visible defects reached production past a green unit suite, all
logic-correct; `tests/browser/regressions.spec.ts` documents them and
tests each one. It earned its keep immediately, catching an overlay that
rendered 447×533 instead of full-screen.

Rules: never move a browser test into the fast suite or vice versa; never
make `make test` depend on a browser; when a defect turns out to be about
appearance rather than logic, its regression test belongs in
`tests/browser/`. Anything the platform itself supplies — the clipboard,
a file download — is a browser test by definition; jsdom has neither.

`make lint` (oxlint) must stay clean and stay QUIET. The config disables
`prefer-tag-over-role`, `no-noninteractive-element-to-interactive-role`
and `interactive-supports-focus` because all three are wrong for
deliberately custom ARIA widgets — a styled combobox cannot be a
`<select>`, and a roving-tabindex group is not meant to be focusable. If
a rule starts firing on correct code, silence it in `.oxlintrc.json` WITH
a reason, or disable it inline where the reasoning belongs (see
`ColorDisc.tsx`). A noisy linter teaches you to ignore linters.

**The three ink tokens must stay WCAG AA (>= 4.5:1) against both papers.**
`tests/browser/a11y.spec.ts` audits nine screens with axe and will fail if
they don't. Before touching `--ink*` or `--paper*`, re-measure with
culori's `wcagContrast` — the same function the goggles use. Note that
`--ink-faint` cannot simply be darkened "until it passes": that lands it
on top of `--ink-muted`. The three were solved together for distinct
ratios (13.15 / 7.79 / 5.07 on `--paper-1`).

`make coverage` is a question, not a target. Do not chase a number:
`src/core` and `src/color` are near 100% because the logic lives there,
and the thin React shells around them are not worth mocking into
submission. Use it to find code no test touches at all — that is how the
clipboard and PNG export turned out to be untested.

culori ships no types, so `src/color/culori.d.ts` declares the functions we
use (`differenceEuclidean`, `wcagContrast`, `filterDeficiencyProt`,
`filterDeficiencyDeuter`, `converter`).

### Non-core layers

Both exist so `src/core/` stays a dependency-free kernel and
`core-purity.test.ts` is never weakened:

- `src/color/` — portable color logic that may use npm libs: the
  color-distance seam, nearest-color lookup, the accessibility "goggles",
  skin metrics, white balance, and the personal-palette scoring rules.
- `src/face/` — **the only place MediaPipe may be imported.**
  `detect.ts` returns a plain `FaceGeometry`, so nothing downstream knows
  the detector exists and swapping models touches one file. Guarded by
  `tests/facePrivacy.test.ts`: no absolute `http(s)` URL may appear here,
  so the model can never be silently repointed at a CDN.

## Deliberate YAGNI (do NOT add these "helpfully")

No state-management library. No router library. No CSS framework.
No plugin abstractions. No runtime data fetching (data is bundled).

**"No router library" is not "no URLs".** This said "No router (single
page)", which reads as a ban on ever touching the address bar — and the
top item in `TODO.md` is shareable deep links, the thing the site most
visibly lacks. They do not conflict: serialising the one state object
into `location.hash` and reading it back on load is a few lines and adds
no dependency. What is banned is pulling in React Router to do it. If you
are here because you were about to reject deep links on YAGNI grounds:
don't.

## Aesthetic

"Washi & Ink": japandi/wabi-sabi + owner's brand (NYC orange #F26522
sparingly, blue #236192 links, warm neutrals). Tokens in
`src/styles/tokens.css`; rendered references in
`docs/superpowers/specs/2026-07-19-*-mockups.html`. Typography: EB Garamond
(names/wordmark only), Atkinson Hyperlegible (UI), Hyperlegible Mono
(codes).

## Commands

`make help` lists everything. Verify `make test` and `make build` pass
before claiming any task complete — and `make test-browser` too whenever
the change touches CSS, layout, fonts or an overlay, since the fast suite
cannot see any of those.
