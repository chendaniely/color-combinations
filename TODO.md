# TODO — deferred ideas (so nothing gets forgotten)

Move finished items to TODO-completed.md with the commit hash.

- [ ] PWA: installable web app with camera access — the **camera capture
      shipped** (photo → perceptual color match → Match/Browse; see README);
      only the **PWA / installable** part (manifest, service worker,
      home-screen install) remains
- [ ] Camera doorways on the Match and Browse tabs — the reusable capture
      boundary (`ColorCapture` / `nearestColors` / `ColorMatches`) is already
      built for this (unified entry point `ColorSampler` launched from
      SearchBox); wiring a camera icon into those two tabs is a fast follow,
      just a different result-callback
- [ ] Better camera-capture UX (v1.1.1 shipped explicit 2-step text as a
      stopgap): the freeze-then-tap flow isn't self-evident — people expect the
      center to be auto-selected and read the frozen photo as "stuck." Options
      to explore: a default center sample the user can override by tapping; an
      on-frame crosshair / tap-pulse hint; or a one-tap "use the center" shortcut
- [ ] Live "eyedropper" sampling (continuous color-under-cursor while the
      camera is live) — v1 deliberately chose freeze-then-tap for accuracy
- [ ] Multi-point / region-average or pattern (multi-color) detection from a
      camera capture — v1 samples one tapped point
- [ ] ΔE2000 (or other) color-difference metric for camera matching — v1
      default is OKLab (Euclidean, via culori); swapping is a one-file
      change in `src/color/colorDistance.ts` (culori already ships
      `differenceCiede2000`), not attempted yet
- [ ] *(Not planned — logged so it isn't "helpfully" re-proposed.)* Camera
      capture history / saved colors — deliberately excluded for privacy;
      the camera stores nothing, see `tests/camera-privacy.test.ts`
- [ ] Native iOS/Android app reusing src/core/ and the processed data
- [ ] Shareable deep links (serialize the app-state object into the URL)
- [ ] Color-blindness simulation modes
- [ ] Outfit / website mockup previews using a chosen combination
- [ ] Fancy shared-element morph animation between granularity levels
      (v1 ships a crossfade)
- [ ] Research the book's true plate area ratios (v1 uses a decorative
      taper; data source has no proportions)
- [ ] README screenshot/GIF of the wheel — deliberately skipped for v1
      (screenshots go stale fast); revisit once the UI settles
- [ ] Deduplicate the `TAPER` constant (`src/components/PlateCard.tsx` and
      `src/exportPng.ts` both hard-code `[1.5, 1.15, 0.9, 0.75, 0.7]`) into
      one shared browser-side module
- [ ] Add combobox ARIA to the header search type-ahead
      (`src/components/SearchBox.tsx`): `role="combobox"`,
      `aria-expanded`, `aria-activedescendant` wired to the highlighted
      `<li>`, not just `role="listbox"`/`aria-selected` on the results
- [ ] Harden the core-purity regex (`tests/core-purity.test.ts`): it only
      catches static `from '...'` imports and a fixed browser-global list —
      add checks for dynamic `import(...)`/`require(...)` and bare
      references to other globals that could leak browser/Node coupling
      into `src/core/`
- [ ] `src/components/PlateCard.tsx` applies `text-${readableTextOn(c.hex)}`
      (`text-dark`/`text-light`) to each plate bar, but neither class is
      defined in `src/styles/app.css` — remove the dead className or add
      the CSS rules (intent was readable overlaid text per bar)
- [ ] Fix stale hue comment in `tests/colorMath.test.ts` — the "Hermosa
      Pink ≈ 316" comment should read "≈ 311.84" (verified:
      `hueOf('#ffb3f0')` === 311.84…); the surrounding
      `toBeGreaterThan(300)`/`toBeLessThan(330)` assertions are still
      correct, only the comment is wrong
- [ ] Owner: verify in browser (deferred from the final whole-branch
      review — needs eyes, not just tests): per-level arc counts on the
      wheel at all 4 granularities; the reworked hover dim + center label
      (rebuilt 2026-07-20 — confirm the flicker is gone and dimming reads
      right); the crossfade between granularity levels; the size-chip filter live
      toggle; clipboard copies (hex/CSS/JSON) actually land on the
      clipboard; PNG download for a few combos including the 5-color
      combo No. 331 (longest name string — check it doesn't overflow the
      canvas); layout at 375px width (bottom sheets for detail panels);
      `prefers-reduced-motion` actually suppresses the crossfade/animations;
      and a product call on whether colors with zero combinations reading
      as zero-width arcs at the Colors granularity level is acceptable or
      needs a minimum-width/placeholder treatment
- [ ] Match page: pin an exact color per shade in a built palette (build is
      shade-level today)
- [ ] Match page: save / name / export a built outfit palette
- [ ] Match page: super-group (Groups) level (currently Colors, Shades, and
      Families only)
- [ ] Match page: clear the "Switched to Shades…" level-switch notice when the
      palette is emptied by a non-switch path ("Start over" / removing the last
      chip), so a stale message can't reappear on the picker
- [ ] Revisit wheel orientation/ordering later (owner: "we can always go back
      to the rotation, color order, and orientation at a later time"): options
      considered but not taken were an RYB primary-triangle wheel (red/yellow/
      blue at 12/4/8 o'clock) and a pure-hue Colors level (browns back in the
      orange sector). Current choice is family-order + red-at-12-o'clock.
- [ ] Gradient source→target highlight strokes on wheel hover — the highlight
      stroke is currently the source-node color only
- [ ] `redAnchorAngle` (`src/core/chord.ts`) assumes each broad family's nodes
      are angularly contiguous (true for today's curated `fine` order). If a
      future dataset interleaves families, the levels 0–2 min/max block-center
      would silently drift off-top — add a validation check or make the anchor
      contiguity-robust if the grouping data ever changes
- [ ] `src/core/sampling.ts`: `averagePatch`'s empty-patch branch
      (`n === 0 → [0,0,0]`) is untested; an object-fit:cover edge tap can also
      map outside bounds → returns black → matches to nearest-to-black. Add a
      test and consider clamping `cx/cy` into `[0,width)`/`[0,height)` before
      sampling.
- [ ] `src/components/BrowseView.tsx`: move the shade-chip
      `aria-label="Clear shade"` from the inner `<span>` onto the `<button>`;
      add a Browse test asserting the shade predicate actually narrows
      `combos.length`; the chip's `border-radius:999px`/padding are
      un-tokenized spacing.
- [ ] `tests/camera-privacy.test.ts`: `toBlob`/`toDataURL` checks are bare
      substring matches (could over-flag an identifier); the `download`-attr
      regex is JSX-shaped only (a programmatic `a.download=…;a.click()` would
      evade it — mitigated because producing image bytes still needs
      toDataURL/toBlob/createObjectURL, all caught).
- [ ] `src/components/sample/ColorMatches.tsx`: the Color/Shade/Family
      `role=radiogroup` and the nearest-colors `role=listbox` grid lack
      arrow-key roving-tabindex (matches the pre-existing MatchPage `.level`
      radiogroup gap).
- [ ] `src/components/MatchPage.tsx`: the always-on lede "Start from a shade
      you have…" and the "Add a shade" section heading read wrong when the
      Colors (level 0) tab is active — generalize the copy.
- [ ] Overlay a11y (`ColorCapture`/`ColorSampler`/`ImagePicker`/`HexPicker`
      `.cam-overlay`, `role="dialog"`): no `aria-modal`, no Escape-to-close,
      no focus trap — add for a later a11y pass.
- [ ] Accessibility goggles — APCA / WCAG-3 perceptual-contrast lens (v1 uses
      WCAG 2 luminance contrast + OKLab-under-CVD).
- [ ] Accessibility goggles — a separate tritan (blue-yellow) color-blind
      option and/or a severity control (v1 covers protan+deutan at severity 1).
- [ ] Accessibility goggles — a UI control to tune `CVD_THRESHOLD` (v1 ships
      the constant 0.10 in `src/color/accessibility.ts`).
- [ ] Accessibility goggles — consider unifying the goggles control with the
      size chips into one filter bar (v1 keeps them adjacent but separate; size
      chips are OR within a dimension, goggles are AND across dimensions).
- [ ] A genuinely-different-dataset selector (a second color book) — the
      original dataset-swap idea, retired for the goggles feature but valid
      future work; would need the dataset-registry + context approach.
- [ ] Accessibility goggles — memoize `allowedFor(state.access)` in
      `BrowseView`/`MatchPage` for uniformity with `ChordWheel`/`App` (they
      `useMemo` it); negligible perf, just pattern consistency.
- [ ] Accessibility goggles — make `LENSES[].passes` consistent for <2-color
      input: `printBwSafe`/`colorBlindSafe` use `.every()` (vacuously true)
      while `webTextReady` uses `.some()` (false); unreachable via
      `accessibilityProfile` (displayable/size≥2 only) but a latent footgun
      for any future direct caller.
- [ ] Color sampler — a color-wheel / RGB-slider source alongside camera /
      upload / hex (deferred from the hex-photo-explorer brainstorm; the hex
      text field covers v1).
