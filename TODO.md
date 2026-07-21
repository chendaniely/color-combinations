# TODO — deferred ideas (so nothing gets forgotten)

Move finished items to TODO-completed.md with the commit hash.

- [ ] Nearest-color search: paste any hex (brand color, paint chip) → find
      the closest of the 157 colors and its combinations — still open (a
      *text* hex input wasn't built; the camera is the input for now), but
      the perceptual matching engine it would call already exists
      (`nearestColors` in `src/color/nearestColor.ts`, OKLab distance) — this
      is now mostly a small UI task (a text field + the existing engine)
- [ ] PWA: installable web app with camera access — the **camera capture
      shipped** (photo → perceptual color match → Match/Browse; see README);
      only the **PWA / installable** part (manifest, service worker,
      home-screen install) remains
- [ ] Camera doorways on the Match and Browse tabs — the reusable capture
      boundary (`ColorCapture` / `nearestColors` / `CaptureResult`) is
      already built for this; wiring a camera icon into those two tabs is a
      fast follow, just a different result-callback
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
