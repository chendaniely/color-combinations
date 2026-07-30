# CLAUDE.md — working rules for this repo

This project is **fully vibe-coded**: the owner does not read
JavaScript/HTML/CSS. You (Claude) are the only maintainer. These rules are
non-negotiable.

## Why the docs are shaped like this: provenance

This repo is kept as a **record of how it was built**, not only as a
codebase. The owner's words, on approving the specs/plans rule below:
*"i like your resolutin for specs and plans. this way we have provinance
on how this repo was built."*

That one idea explains files that otherwise look like overhead:

- `PROMPTS.md` — the owner's words, verbatim, in order.
- `CHANGELOG.md` — each release paired with the prompt that drove it.
- `docs/superpowers/specs/` + `plans/` — what was designed, and how.
- `TODO-completed.md` — what was finished, and **the commit that did it**.

Together they answer "why is this like this?" for anything in the repo,
which matters more than usual here: the owner does not read the code, and
every future maintainer is a fresh session with no memory of this one.

So: **never delete or rewrite the record to make it tidy.** Correct it in
place, dated, with the old claim still visible. A tidy history that lies
is worth less than a messy one that doesn't.

`tests/provenance.test.ts` enforces the checkable part — every commit
hash cited in `TODO-completed.md` must resolve, and every completed entry
must cite one. It skips on a shallow clone (CI checks out at depth 1), so
it runs on developer machines where the history actually exists.

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
- The app reads **seven** data files, every one schema-versioned and
  validated at load by `src/data.ts` — the ONLY module allowed to import a
  data file. The word *import* is load-bearing: an `import` bundles the file
  into the app, which is why exactly one module may do it. Tests may read
  the same files with `readFileSync` (several do, to assert against the real
  book) because that runs in Node and bundles nothing. Never convert such a
  read into an import to make a test tidier.

  This said "exactly two" until v1.7.0. The count grew deliberately, on the
  owner's instruction — *"save whatever color data you have as separate
  datasets in the data folder … this way the data in the site can be used and
  worked with independently and there is a citation / reference on what it
  is. i'd love for this to become a larger resource."* Each file is therefore
  self-describing (`schemaVersion`, prose `description`, `sources` ids) and
  usable by someone who does not care about this site. **The count is not the
  rule; the single importer is.**

  - `data/processed/colors-data.json` is **generated** from a vendored
    source and must never be hand-edited. Source-format knowledge lives
    ONLY in `scripts/ingest/`.
  - `data/reference/sources.json` is the **citation registry**. Every other
    dataset cites into it by id, so a source is described once. Every entry
    names the specific claim it `supports`; a citation that supports nothing
    is decoration. `make check-links` verifies the URLs and is deliberately
    NOT in `make test` or CI — whether someone else's server is up is not a
    fact about this repo.
  - `data/reference/pccs-*.json` are **transcribed by hand** from published
    PCCS references, and their `notes` record where we departed from a
    source and why. `pccs-grid.json` is **generated** from the other two.
  - `data/curated/season-rules.json` is **authored by hand**. It holds the
    four parent seasons (`sourced: true`, with citations) and the twelve
    sub-seasons (`sourced: false`, ours). The validator rejects the file if
    either flag flips — that line is what the site tells the visitor, and
    `docs/color-analysis-sources.md` explains it.
  - `data/processed/season-colors.json` is **generated** from the rules by
    `scripts/build-season-colors.ts`. `tests/seasonColors.test.ts`
    regenerates it and fails on any diff, so it cannot drift.
  - The five colour-analysis files are **lazy-loaded** via `loadSeasonData()`
    — ~98 kB that only the You tab needs. Importing them statically grew the
    main bundle 444 kB → 531 kB and timed out the browse accessibility
    audit, a screen with no seasons on it. The `import()` stays inside
    `src/data.ts` so the single-importer rule holds.
    `tests/browser/seasonFit.spec.ts` guards the split.

  Replaced `data/curated/seasons.json`, which held twelve hand-listed
  palettes it admitted had no published source. Its admission is quoted in
  `docs/color-analysis-sources.md` rather than deleted with the file.
- App state is one serializable object (`src/core/state.ts`). That decision
  paid for deep links, which are two modules split along the purity line:
  - `src/core/urlState.ts` is PURE — `encodeState`/`decodeState`, string work
    only, no `location`/`window`/`history`/dataset. All of the interesting
    logic is here, which is why 21 hostile URLs run in
    milliseconds without a browser.
  - `src/urlSync.ts` owns the browser: the address bar, the history stack, and
    checking a decoded id against the book.

  **A `SkinReading` MUST NEVER enter a URL.** Not `skin`, `hair`, `ita`,
  `skinL`, `skinHue` or `contrastGap`. A link carrying those, pasted into a
  chat, publishes the sender's skin tone to someone else's server. Owner
  decision, 2026-07-29. `tests/urlPrivacy.test.ts` checks by field name AND by
  value, so a rename cannot slip past, and belongs with the other privacy
  guards: never weaken it.

  Two rules that came out of building it:
  - **Panels push, everything else replaces.** Back closes a panel; filters do
    not stack history entries.
  - **`decodeState` omits what it cannot parse** rather than defaulting in
    place, so the caller's merge over `initialState` always yields a renderable
    state. A URL is the only input to this site that arrives from outside it.
  - **Sanitising is asymmetric on purpose.** A stale FILTER or palette key is
    dropped silently; a stale SELECTION is kept so `MissingPanel` can explain
    it. The selection is the subject of the link.
- Every design token (color/font/spacing/motion) lives in
  `src/styles/tokens.css`. No hard-coded colors in components, with exactly
  **three** exemptions, all because the colour IS the content rather than a
  style choice:
  1. **Sanzo Wada's data colours** — the book's own hex values.
  2. **Colour-space renderings** — the hue stops and saturation wash of the
     picker disc (`.disc-face` in `app.css`) and the wheel's ribbon fills.
     A hue wheel cannot be drawn in tokens; it has to be actual hues.
  3. **Colour-science anchors** — the four sRGB primaries in
     `src/color/pccsMap.ts` (`#ff0000`, `#ffff00`, `#00ff00`, `#0000ff`),
     which stand in for PCCS's psychological primaries when mapping the hue
     circle. They are measurements, not decisions: changing one would move
     the hue circle, not restyle anything. Added 2026-07-29 after a sweep
     found them sitting outside all stated exemptions — see the paragraph
     below, which is exactly the situation it was written for.

  Exemption 2 was previously claimed by a comment in `app.css` citing a rule
  that only granted exemption 1. If a fourth exemption ever seems necessary,
  the honest move is to add it here, not to cite this rule for something it
  does not say.

  **`opacity` on text evades this rule entirely.** Fading text changes its
  rendered contrast while the token stays correct, so no audit of colour
  values can see it. It shipped twice: `.you-floor em` at `opacity: 0.7`
  measured 3.66:1 (v1.5.0, live for two releases), and it passes in one state
  while failing in another, which is why nobody noticed. Use a different
  token, not transparency.

  **An element that floats over the page needs the page's gradient, not a
  paper token.** `body` paints `linear-gradient(...) fixed`, and `fixed` means
  the gradient is positioned against the VIEWPORT — so any sticky or fixed
  surface must repeat that same declaration to paint the pixels it covers at
  every scroll offset. `.you-doorways` does. Substituting `background:
  var(--paper-1)` looks right in a screenshot of the top of the page and shows
  a widening seam as you scroll, which is the kind of defect that ships because
  nobody screenshots the middle.

  **A canvas cannot read `var(--x)`, so it must read the token at run time.**
  `exportPng.ts` once copied the hex values and they went stale: v1.6.0 moved
  `--ink-muted` for contrast and the export kept the retired value, so every
  PNG the site exported had sub-AA caption text. It now calls
  `getComputedStyle`, and `tests/exportTokens.test.ts` asserts its jsdom
  fallbacks still equal the tokens they stand in for.
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
  `exportPng`), `--disc-size` (the colour disc, whose pin is placed
  in percentages so TypeScript holds no copy of the size).
- **The ways into a colour live in `src/components/sample/ColorEntry.tsx`,
  and nowhere else.** Search, camera, upload, pick — one presentational
  component rendered both inside `ColorSampler`'s overlay and inline on
  Match's Colors level. Adding a fifth way in, or reordering them, is then
  one edit by construction. Do not write a second card list "just for this
  screen": the reason the camera was undiscoverable up to v1.8.3 is that
  its only card list was buried in an overlay behind a pencil icon.
  Search is deliberately the odd card out — it focuses the permanent
  header input rather than opening a second one — and both suites assert
  that asymmetry, so it is a decision, not an oversight.

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

Runtime: react, react-dom, d3, culori, @mediapipe/tasks-vision,
@phosphor-icons/react. Dev: vite,
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
@phosphor-icons/react = the icon set, added 2026-07-30 on the owner's call —
*"i'm okay with an icon library instead of emojis. gives us more flexibility."*
It replaces emoji, which the OS renders: four cards drew four different
illustration styles, changed shape per platform, and could take neither a stroke
weight nor a token colour, so nothing tied them to the hairlines the rest of the
site is drawn with. **Import every glyph by name** — the barrel is ~9000 icons
and only named imports tree-shake. **Measured 2026-07-30: +12.15 kB raw,
+4.10 kB gzipped** for four icons plus the shared renderer, which is why it sits
in the main bundle rather than lazy-loading: rule 4 below is about weight worth
deferring, and 4 kB is not it. Re-measure if the count grows a lot;
@mediapipe/tasks-vision = on-device face detection for the You tab,
Apache-2.0 with zero transitive dependencies, lazy-loaded and self-hosted
from `public/mediapipe/`. **~3.7 MB over the wire** (measured 2026-07-29:
3.43 MB wasm + 0.08 MB js + 0.20 MB model, compressed), against **11.5 MB
uncompressed on disk** — the wasm alone is 11 MB and compresses about 3.4x.
Both numbers are given because the on-disk figure looks alarming next to
the dependency rule and the transferred one is what a visitor actually
pays.

## Testing: two suites, and why

`make test` (vitest + jsdom, ~850 checks as of 2026-07-29, seconds) proves the site
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

**The three ink tokens must stay WCAG AA (>= 4.5:1) against all THREE papers.**
`tests/browser/a11y.spec.ts` audits nine screens with axe and will fail if
they don't. Before touching `--ink*` or `--paper*`, re-measure with
culori's `wcagContrast` — the same function the goggles use. Note that
`--ink-faint` cannot simply be darkened "until it passes": that lands it
on top of `--ink-muted`. The three were solved together for distinct
ratios (13.15 / 7.79 / 5.07 on `--paper-1`).

`--paper-hi` is easy to overlook — it is mostly a foreground on dark, but
`app.css` also uses it as a background — so this said "both papers" until a
documentation audit on 2026-07-29 counted three. **Measure against
`--paper-2`, which is the binding constraint:** ink-faint scores 5.07 on
paper-1, 5.47 on paper-hi and **4.61 on paper-2**, eleven hundredths above
the line. A change that looks safe on paper-1 can fail there.

Two ways to break this rule without touching a token, both of which have
shipped: `opacity` on text (see the token section above), and a canvas
copying hex values instead of reading them.

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

## The release cadence: debt first, then ONE feature

The owner set this on 2026-07-29, looking at a `TODO.md` with a long feature
list and a shorter list of known defects:

> *"let's make sure we loop through and fix bugs and tech debt before adding
> more features. there's a huge feature list to incorporate and we shoudl take
> each indiviually with a bug fix loop in between"*

So the order of work is fixed, and it is not negotiable by enthusiasm:

1. **Fix bugs and pay debt first.** Not just the items written down — actively
   look. The two most valuable findings of the last three releases were both
   things nobody had listed: the site failing the accessibility standard its
   own feature enforces, and `keyName()` crashing Browse on an id that only a
   URL could supply.
2. **Then ONE feature.** Not a batch. Pick it, design it, ship it.
3. **Then another bug-and-debt loop**, before the next feature.

Why this holds even when a feature looks small and safe: v1.7.0 shipped four
defects of its own (identical sub-seasons, a washed-out tone rendering, 98 kB
in the wrong bundle, and a fit panel that hid the very gap it existed to show).
Every one was caught by looking *after* the feature was built and *before*
starting the next one. A batch of features would have buried all four.

Practical consequences:

- Do not open a feature branch while `TODO.md` has an actionable defect on it.
  "Actionable" excludes items needing a person or a design asset — those are
  blocked, not deferred.
- When a feature turns up a bug in passing, fix the bug in its own commit and
  say so. Do not fold it into the feature.
- A tidying release with no visible change is a legitimate release. v1.6.0 and
  v1.7.1 were both exactly that.

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
