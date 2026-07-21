# TODO — completed

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
