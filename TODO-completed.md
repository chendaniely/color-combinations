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
