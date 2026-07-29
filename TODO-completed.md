# TODO — completed

## v1.6.0 — consolidation: defects, refactor, real-browser tests (2026-07-29)

Owner: *"let's go in and clear up all defects. let's take a pass and see if
things also need to be refactored."*

**Third and fourth passes (owner: "keep looping over and doing passes untill you don't find anything more")**

- [x] The site failed WCAG AA in its own chrome while shipping a feature that
      judges the book's colours against WCAG AA. axe found serious
      colour-contrast violations on three screens; `--ink-muted` was at 4.24 and
      `--ink-faint` at 2.02 where small text needs 4.5. All three ink steps
      re-solved together for distinct ratios (13.15 / 7.79 / 5.07) so the
      hierarchy survived — darkening `--ink-faint` alone would have made it
      identical to `--ink-muted` (`f23392c`).
- [x] Nine-screen axe audit added, plus a tenth at phone width (`f23392c`,
      `9678856`).
- [x] Five TypeScript strictness flags enabled after measuring each one; the
      two rejected ones have their numbers recorded in `tsconfig.json` so
      nobody re-litigates them (`f23392c`).
- [x] `transform.ts` typed `fineId` as `string` when the expression was
      `string | undefined`. Now fails at ingest naming the slug and the file to
      edit, instead of a runtime message about colour 42 (`f23392c`).
- [x] Dead CSS rule `.you-next` (`f23392c`).
- [x] The wheel scrolled sideways by 14px at 375px — `.wheel-controls`
      shrink-to-fit inside a centred column overflowed both sides. Every view
      is now checked for horizontal overflow at phone width (`9678856`).
- [x] `prefers-reduced-motion` verified for the first time, including that
      suppressing the animation does not leave the panel stuck at its opening
      opacity (`9678856`).
- [x] Tap targets checked against WCAG 2.2's 24x24 minimum, allowing for the
      padded `::before` hit area on `.infotip-btn` (`9678856`).
- [x] Clipboard copy and PNG download covered in the browser, closing two
      manual checklist items (`363a3d0`).

**Second pass (owner: "before we push... any more refactoring... other libraries")**

- [x] The project had NO linter. oxlint added, wired into `make lint` and CI,
      and configured down from ~40 warnings to 4 real ones — `react-in-jsx-scope`
      is obsolete under React 19's automatic runtime and `prefer-tag-over-role`
      wanted a `<select>` for a custom swatch combobox (`363a3d0`).
- [x] `PaletteTabs`' effect carried a comment claiming that depending on `shown`
      directly would "rebuild the Set every render and loop". It would not —
      `shown` is a ternary over two memoized arrays, and `seasonById` returns the
      array's own object. Deps simplified to say something true (`363a3d0`).
- [x] The colour disc's ARIA smell documented inline where the reasoning belongs,
      rather than silenced globally (`363a3d0`).
- [x] Two hard-coded `rgb(47 42 38 / …)` shadows — the last un-tokenized colours
      in the stylesheet. Now `--ink-rgb` (`363a3d0`).
- [x] Coverage measured for the first time, and it found the real gap: the
      clipboard (`src/copy.ts`, 0%) and the PNG export (`src/exportPng.ts`,
      13.88%, zero functions covered) had no test at all, both being things
      jsdom cannot do. Now covered in the browser suite — including the
      downloaded file's PNG magic bytes and a check that the exported plate's
      bar proportions match the plate on screen, which guards the
      `plateLayout.ts` refactor made the same day (`363a3d0`).
- [x] `no-shadow` on a duplicated `TAU` in `tests/chord.test.ts` (`363a3d0`).

**Wrong claims and dead code**

- [x] The "taller bars = the dominant colour / main garment" claim in Browse,
      the About panel and the README. The book records no proportions at all:
      all 338 multi-colour combinations are stored in ascending colour-id
      order and a combination has no area field (`e686b52`).
- [x] `PlateCard` applied `text-${readableTextOn(hex)}` where neither class
      existed in any stylesheet and no `.plate-bar` contains text; the
      className and its now-callerless helper both removed (`e686b52`).
- [x] Stale hue comment in `tests/colorMath.test.ts` — "≈ 316" → "≈ 311.84"
      (`e686b52`).
- [x] `ColorFields` used `if (next)` where `next !== null` says what it means
      (`e686b52`).
- [x] Picker labelled its field `Hex` while its siblings are RGB/CMYK and the
      detail pages say HEX; now HEX everywhere (`e686b52`).
- [x] The disc mockup's saturation wash faded at 78% of the radius instead of
      100% — the bug already fixed in `app.css`. It was kept as a record of
      what the owner reviewed, but it is also the designated starting point
      for the Browse-page disc, which made it a trap (`e686b52`).

**Duplication**

- [x] `TAPER` hard-coded in both `PlateCard` and `exportPng`, so a drift would
      make a downloaded PNG disagree with the plate on screen. Now
      `src/plateLayout.ts` (`e686b52`).
- [x] The picker disc's size lived in three places (`RADIUS = 118` in TS,
      `236px` twice in CSS). The pin is now placed in percentages, so the
      component holds no copy at all and the disc can be made responsive
      without touching TypeScript (`e686b52`).
- [x] `rgbToHsv` duplicated the hue-sector maths from `rgbToHsl`; extracted,
      with a test asserting the two agree across the whole wheel (`e686b52`).
- [x] The Browse filter chip's `border-radius: 999px` and off-grid padding —
      the last un-tokenized spacing (`a7b96ba`).

**Accessibility**

- [x] Seven `<div role="dialog">` overlays with no focus trap, no Escape and
      no `aria-modal`, plus six copies of the same close button under four
      labels. One native `<dialog>` component now (`e37dcfe`).
- [x] Overlay inputs inheriting `.search-box input` (0,1,1) — the trap that
      caused the picker's wrong font and its orange "valid looks invalid"
      underline. Portalling to `<body>` removes the ancestor, so it is now
      structurally unreachable rather than patched around (`e37dcfe`).
- [x] Search type-ahead had no combobox ARIA: nothing announced the popup or
      the highlighted result. Now `role=combobox` with `aria-expanded`,
      `aria-controls` and `aria-activedescendant` (`1331a7f`).
- [x] `role=option` rows wrapping `<button>`s — invalid, and each button stole
      a tab stop from a widget whose point is that focus stays in the input
      (`1331a7f`).
- [x] No roving tabindex on the nearest-colours grid, the match-level
      radiogroup or MatchPage's level radiogroup: twelve tab stops and no
      arrow keys. Now one shared `useRovingFocus` (`1331a7f`).
- [x] The colour disc announced nothing on arrow-key movement; a 2D control
      has no honest single `aria-valuenow`, so it now reports position through
      a polite live region (`1331a7f`).
- [x] `ColorDisc` never explicitly released pointer capture (`1331a7f`).

**Copy**

- [x] MatchPage said "shade" regardless of the active level, so Colors and
      Families showed instructions for a level the visitor was not on
      (`1331a7f`).
- [x] The level-switch notice lingered in state while hidden and reappeared
      when the palette was later emptied, describing a switch long past
      (`1331a7f`).

**The You tab's honesty**

- [x] The hair sample was never checked against the skin sample, so a probe
      landing on a forehead produced a confident contrast reading from
      comparing the face with itself (`5e92a67`). The threshold is the
      colour-distance seam's own VERY_CLOSE, deliberately far below
      CONTRAST_LOW so it cannot steal a genuine low-contrast reading — tested.
- [x] The app said nothing about photo quality; a poor frame looked exactly as
      confident as a good one. `src/core/photoQuality.ts` flags dark,
      blown-out and unevenly-lit frames before Continue (`5e92a67`).

**Tests**

- [x] Nothing covered CSS cascade, fonts or layout, and five user-visible
      defects had shipped past a green suite because of it. Playwright +
      pinned Chromium now drive the built site; each of the five has a
      regression test (`f436153`). Owner chose the pinned-browser option over
      driving an installed Chrome.
- [x] It caught a regression on its first run: the new overlay rendered
      447×533 instead of full-screen, because the UA's `width: fit-content`
      makes `inset: 0` over-constrained (`f436153`).
- [x] UNDIAGNOSED flaky test, open since v1.4.0 with its name lost to a
      `tail` pipe. Reproduced twice, both times as
      `matchedCombinations > the floor control > offers all four stops` and
      both times a TIMEOUT, never an assertion (7122ms against a 5000ms
      default). Cause: heavy jsdom renders of the real dataset, first test in
      its file. Verified against the triggering condition — under deliberate
      CPU contention the same test took 7484ms and passed (`a7b96ba`).
- [x] `core-purity` caught only static `from '...'`, so one `await
      import('d3')` would have walked through; now covers dynamic import and
      require, bans computed specifiers, and checks 21 browser globals
      (`5e92a67`).
- [x] The two privacy guards each kept a copy of the forbidden-API list, and
      the `download` rule was JSX-shaped only so `a.download = …` evaded it.
      Shared and hardened, and each rule now ships samples it must catch and
      must not (`5e92a67`).
- [x] `averagePatch`'s untested empty-patch branch returned black for a tap
      outside the image, so the caller matched the visitor to the book colour
      nearest black. Now clamps to the nearest real pixels (`a7b96ba`).
- [x] The three accessibility lenses disagreed below two colours — `some` is
      false on an empty list, `every` vacuously true (`a7b96ba`).

**Other**

- [x] The upload picker cover-cropped into a fixed 3:4 stage, putting the left
      and right of a landscape photo out of eyedropper reach. The stage now
      takes the photo's aspect ratio and uses `contain` — the `fit` parameter
      it needed had been added in v1.5.0 (`a7b96ba`).


## v1.5.0 — the You tab (2026-07-28)

- [x] Photograph your face and get the book colours that suit you — the whole
      feature, spec `2026-07-28-personal-color-analysis-design.md`, shipped
      across `68c849e..9990467`.
- [x] Camera doorways beyond the sampler — the You tab adds a third camera
      entry point with its own capture flow (`3b31d13`).
- [x] Season→colour mapping as editable data rather than code (`d46e0bc`),
      the owner's idea; see the learning moment written up the same day.
- [x] The dependency budget replaced by four properties instead of a package
      whitelist, reopened by the owner (`CLAUDE.md`, `965c069`).
- [x] `sampleCanvasAt` gains the `fit` parameter that TODO.md had specified —
      `Math.min` for contain vs `Math.max` for cover (`abe4cdc`). The camera and
      upload pickers keep the cover default; the image-upload cover-crop issue
      logged separately is now one line away from fixable.


Format: `- [x] item — done in <commit hash> (YYYY-MM-DD)`

## v1 (2026-07-19)

- [x] Project scaffold: Vite + React + TypeScript with documentation
      contract — done in 2c2c4a7 (2026-07-19)
- [x] Data layer: core color math + purity guard, dataset schema/validator,
      vendored Sanzo Wada raw data + hand-curated grouping hierarchy,
      ingest transform + CLI + `make update-data` — done in
      52ba0e8..0a6961f (2026-07-19)
- [x] Core kernel: dataset indexing/query functions, chord-matrix math
      with granularity levels and size filters, export formatters,
      serializable app-state reducer — done in 7c027cc..cc6d105 (2026-07-19)
- [x] App shell: design tokens, self-hosted fonts, validated data load —
      done in 1673be3 (2026-07-19)
- [x] Chord wheel: granularity levels, size filters, hover highlighting —
      done in 09a8c34 (2026-07-19)
- [x] Detail panels, combination plates, copy-to-clipboard — done in
      1e82165 (2026-07-19)
- [x] Browse view: size, family, and contains-color filters — done in
      aeaeba3 (2026-07-19)
- [x] Color search, About panel with usage recipes, surprise-me animation
      — done in e0561b9..ead0202 (2026-07-19)
- [x] PNG plate export — done in d3e0f35 (2026-07-19)
- [x] Responsive layout, reduced-motion support, a11y polish, footer —
      done in 50dc585 (2026-07-19)
- [x] Final whole-branch review fixes (search example, Escape-key
      scoping, curation comments, CI strictness, smoke-test coverage) —
      done in d7cdfbe (2026-07-19)
- [x] v1-build merged to main — done in 0ae7b32 (2026-07-19)
- [x] v1 site: wheel, browse, panels, search, exports, deploy — CI
      pipeline (test + typecheck + build + GitHub Pages deploy), live at
      https://chendaniely.github.io/color-combinations/ — done in
      575dcd5 (2026-07-19)

## Post-v1 (2026-07-20)

- [x] Wheel hover flicker fix: delegated events + keyed hover state +
      scoped dimming (container class + `.hot` set) instead of per-element
      listeners doing full-scene sweeps; blend mode only at group levels —
      done in db37b1b (2026-07-20)
- [x] Browse: group plates under 2 / 3 / 4+ color section headers — done in
      3cd01df (2026-07-20)

## Session 5 — wheel legibility & orientation (2026-07-20)

- [x] Rare-partner links invisible on hover: give highlighted ribbons a
      stroke-width floor (bolder on color/arc-hover than single-link hover) so
      even one-off pairings read, without changing the resting layout
      (proportional-width-with-a-floor) — done in 76ddf7f (2026-07-20)
- [x] Brighten the partner colors' arcs on color-hover (not just the connecting
      links) — done in 76ddf7f (2026-07-20)
- [x] Consistent, standard wheel orientation: family order at every granularity
      (Colors re-sorted from pure hue so browns cluster like every other level),
      rotated so red sits at 12 o'clock (pure `redAnchorAngle`; Red-block center
      for Colors/Shades/Families, reddest-in-Warm for Groups) — done in
      972e10b..4337eae (2026-07-20)

## Session 5 — post-review UI tweaks (2026-07-20)

- [x] Reorder the top nav to Wheel · Match · Browse · About (swap Match/Browse)
      — done in 5b209f4 (2026-07-20)
- [x] Make the "Iro" wordmark a clickable home button (returns to the wheel and
      dismisses any open About panel / detail selection) — done in 87ffea2
      (2026-07-20)

## Session 6 — camera color capture (2026-07-21)

Design + plan: `docs/superpowers/specs/2026-07-20-camera-color-capture-design.md`,
`docs/superpowers/plans/2026-07-20-camera-color-capture.md`. Executed
subagent-driven, 13 tasks, each task-reviewed. Full range: `f3280e3..9900ffa`.

- [x] Task 1 — `colorDistance` metric seam: perceptual (OKLab, via culori)
      distance between two RGB colors + `closenessLabel` thresholds, isolated
      in `src/color/colorDistance.ts` so the metric is a one-file swap later
      — done in f3280e3 (2026-07-21)
- [x] Task 2 — `nearestColors`: ranks every book color by the distance seam,
      returns the top N — done in a3dfa9b (2026-07-21)
- [x] Task 3 — `averagePatch`: samples a clamped, averaged RGBA patch from an
      `ImageData`-style array (pure, stays in `src/core/`) — done in
      bd4498d (2026-07-21)
- [x] Task 4 — `keyName`/`keySwatches`/`keyColorId`/`isColorKey`: resolve a
      key that may now be a single color or a shade/family group — done in
      d27559d (2026-07-21)
- [x] Task 5 — app state: `MatchLevel` gains Color (0); `browse` filter
      (`family`/`shade`/`colorId`) lifted into `AppState` with a
      `setBrowseFilter` action — done in 667bddc (2026-07-21)
- [x] Task 6 — matching/remap logic extended to the Color level (partner
      suggestions, `remapKeysToLevel` across 0/1/2) — done in 695e837
      (2026-07-21)
- [x] Task 7 — palette tray + suggestion chips render color-or-group keys via
      the new key helpers — done in 9cada34 (2026-07-21)
- [x] Task 8 — Match page: **Colors** level added to the level selector; the
      empty Colors state shows a short inline prompt to search or snap a
      color instead of all 157 swatches — done in 6e46ca7 (2026-07-21)
- [x] Task 9 — Browse: filters (`family`/`shade`/`colorId`) read from app
      state; **shade filter** with a dismissible chip — done in 3f24ad0
      (2026-07-21)
- [x] Task 10 — camera stream helpers (`cameraSupported`, `stopStream`) +
      the privacy source-scan guard test (`tests/camera-privacy.test.ts`,
      fails the build on any forbidden network/storage API in
      `src/components/camera/*`) — done in 1cebca3 (2026-07-21)
- [x] Task 11 — `ColorCapture` overlay: live viewfinder → freeze → tap →
      `averagePatch` → `onSample(rgb)`; stops all tracks on close/unmount;
      privacy line in the UI — done in 47d9a74, with tap-coordinate-mapping
      fixes in 1577312, 1b04dd7 (2026-07-21)
- [x] Task 12 — `CaptureResult`: sampled-swatch chip, hero, scrollable near-
      match list (tap to promote), Color/Shade/Family selector (Shade
      default), plain-words closeness, Match/Browse actions — done in
      c8cd5c8, test pinned in 6dd3da0 (2026-07-21)
- [x] Task 13 — search-box doorway: feature-detected camera icon, "Find a
      color…" placeholder, wires capture → Match (seeds palette) / Browse
      (applies the scoped filter + switches tabs) — done in 9900ffa
      (2026-07-21)
- [x] Seed the Match page from a detected shade (photo → shade → land
      here) — superseded by the shipped design: capture lands at any of
      Color/Shade/Family, not shade only — done in c8cd5c8, 9900ffa
      (2026-07-21)
- [x] Three new dependencies added with justification lines in `CLAUDE.md`:
      `culori` (runtime), `jsdom` + `@testing-library/react` +
      `@testing-library/dom` (dev) — done in 9a4e643 (2026-07-21)

## Session 7 — accessibility goggles (2026-07-21)

Design + plan: `docs/superpowers/specs/2026-07-21-accessibility-goggles-design.md`,
`docs/superpowers/plans/2026-07-21-accessibility-goggles.md`.

- [x] Access lens filter in app state (AccessLensId, access, toggleAccess) —
      done in 1c4272a (2026-07-21)
- [x] Accessibility lens seam in src/color (web-text / print-bw / colorblind,
      thresholds, profile, allowedComboIds) — done in 5ba3fda (2026-07-21)
- [x] Optional allowed-combo filter through chord + matching core seams —
      done in c58624a..46b681a (2026-07-21)
- [x] accessProfile + allowedFor glue and the AccessibilityGoggles control —
      done in 3fd2fe5 (2026-07-21)
- [x] Goggles wired across wheel, browse, and match + docs — done in
      ff0af04 (2026-07-21)

## Session 9 — hex/photo color explorer (2026-07-22)

- [x] Hex / photo color explorer — user can provide a color directly (paste
      a hex like NYC orange `#F26522` or blue `#236192`) OR upload a photo,
      then see the nearest/similar book colors, mirroring the camera-capture
      flow via a unified `ColorSampler` and `ColorMatches` result grid (12
      nearest colors with closeness labels). Three sources (camera/upload/hex)
      → one "Sample a color" picker entry point. Executed subagent-driven in
      5 tasks (Tasks 1–5), each task-reviewed. Code: fc9d8ff..932c687; docs
      (Task 6): 4d56e56..1f95a28 (2026-07-22)
- [x] Nearest-color search: paste any hex (brand color, paint chip) → find
      the closest of the 157 colors and its combinations — HexPicker + pure
      `parseHex` in core kernel enable text hex input alongside camera/upload,
      feeding the same `nearestColors` + `ColorMatches` result grid. Done in
      fc9d8ff..932c687 + 4d56e56 (2026-07-22)

## Session 14 — color picker (2026-07-28)

- [x] Color sampler — a color-wheel / RGB-slider source alongside camera /
      upload / hex. Shipped as "Pick a color": an HSV wheel with a brightness
      slider plus synced HEX/RGB/CMYK fields, replacing the hex-only picker.
      Pure math in `src/core/colorMath.ts` (`rgbToHsv`/`hsvToRgb`,
      `rgbToCmyk`/`cmykToRgb`, `parseRgb`/`parseCmyk`) and a new pure
      `src/core/discGeometry.ts` so the wheel's geometry is unit-testable
      without a DOM. The book-color overlay was mocked up and rejected — see
      TODO.md. Code: d2ff5f6..3b83f17, plus final-review fixes in 6e38543
      (2026-07-28)
