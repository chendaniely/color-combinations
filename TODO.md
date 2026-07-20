# TODO — deferred ideas (so nothing gets forgotten)

Move finished items to TODO-completed.md with the commit hash.

- [ ] Nearest-color search: paste any hex (brand color, paint chip) → find
      the closest of the 157 colors and its combinations
- [ ] PWA: installable web app with camera access ("photo → related
      combinations") — stepping stone to native
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
- [ ] Match page: super-group (Groups) level (currently Shades + Families only)
- [ ] Seed the Match page from a detected shade (photo → shade → land here) —
      depends on the nearest-color/photo work already in this list
