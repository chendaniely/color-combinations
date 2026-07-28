# TODO — deferred ideas (so nothing gets forgotten)

Move finished items to TODO-completed.md with the commit hash.

- [ ] The committed mockup `docs/superpowers/specs/2026-07-27-color-picker-disc-mockup.html`
      has the same saturation-wash bug fixed in `src/styles/app.css`'s
      `.pick-face` (final review of feat/color-picker): its radial-gradient
      white stop fades out at 78% of the radius instead of 100%, so the disc
      renders saturation wrong relative to the HSV math. The mockup is the
      designated starting point for a future Browse-page disc feature — fix
      its gradient stop to `100%` if/when it's reused. Left unchanged for now
      because it's a historical record of what the owner reviewed.
- [ ] Visible in-page analytics disclosure — v1.3.3 added Google Analytics and
      documented it in the README's Analytics section only. A small footer line
      ("This site uses Google Analytics") was offered and declined for now;
      it needs a footer component and a tokens pass, since there's no footer today
- [ ] Cookie-consent banner for the analytics tag — deliberately skipped in
      v1.3.3. Only worth building if EU/UK visitors start to matter, since GA
      sets cookies before any consent is asked. Would also need the tag to load
      *conditionally*, which the current build-time injection doesn't do
- [ ] Custom analytics events (wheel clicks, palette builds, exports) — v1.3.3
      is page views only, on purpose. Add one only when there's a specific
      question worth answering, not for a dashboard's sake

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
      the mobile touch-scrub on the wheel (updated 2026-07-23 — press/drag a
      finger to preview a color/pair with its center-label name, then LIFT to
      open the highlighted one; confirm hold-drag-then-lift opens the right
      combo, a quick tap still opens on the first try at all 4 granularities,
      dragging off past the wheel's edge and lifting cancels (nothing opens,
      the highlight clears while the finger is out there), and the page never
      scrolls under the drag now that `.chord-wheel` is `touch-action:none`);
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
- [ ] Overlay a11y (`ColorCapture`/`ColorSampler`/`ImagePicker`/`ColorPicker`
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
- [ ] Sampler overlays inherit `.search-box input` styling, because
      `ColorSampler` renders inside `.search-box` — so `.search-box input`
      (0,1,1) outranks any bare single-class rule on an overlay input. This bit
      the color picker (wrong font, and an orange focus underline that made
      valid fields look invalid) and was fixed by scoping to `.pick-fields
      .pick-input`. Any FUTURE overlay input will hit the same trap. The real
      fix is to stop nesting the overlay inside `.search-box` — it is a
      full-screen `position: fixed` layer and has no reason to live there.
- [ ] No test covers CSS cascade, fonts, or layout — jsdom implements none of
      them. FIVE user-visible defects shipped past a green 199-test suite, a
      review after every task, and a whole-branch review: the disc's 78%
      saturation stop (colors didn't match the numbers below them), the
      unreachable Explore button on short viewports, color codes in the UI font
      instead of the mono one, a focused field turning the same orange as an
      invalid one, and the "BRIGHT" label running under its own slider. Every
      one was found by opening a browser, and none were logic bugs — the logic
      was right throughout. Worth deciding whether the owner browser checklist
      should become a written, repeatable script, and whether anything can
      assert cascade/layout automatically (a real-browser smoke test is the
      only thing that would; note it would add a dependency, so it needs an
      explicit decision against the dependency budget).
- [ ] Color sampler — image-upload picker cover-crops non-portrait photos to
      3:4 aspect-ratio (`.cam-canvas { object-fit: cover }`), so left/right edge
      regions can't be eyedroppable. A fix would give `ImagePicker` an
      `object-fit: contain` display and a `fit` param on `sampleCanvasAt`
      (`Math.min` for contain vs the current `Math.max` cover) — deferred from
      the hex-photo-explorer final review.
- [ ] Browse page — plot all 157 colors on a hue/saturation disc with a
      brightness slider that slices to the colors at that lightness (owner:
      "i liked how you can plot all the points and then also points in same
      brightness"). Deferred from the color-picker session as its own feature;
      open questions: does clicking a dot filter Browse, how does it interact
      with the accessibility goggles, what does it do on a phone. Starting
      point: discs B and D in
      `docs/superpowers/specs/2026-07-27-color-picker-disc-mockup.html`.
- [ ] Color picker — do NOT add the book-color overlay to the picker disc. It
      was mocked up live against all 157 colors and rejected: on a control whose
      job is aiming at a color, the dots compete with the target. The plot
      belongs on Browse (above), not here.
- [ ] UNDIAGNOSED: one test failed once (1 of 199) during the v1.4.0 session,
      on the `61a5317` docs commit. The failing test's NAME was lost — the
      command piped `make test` through `tail -6`, which truncated the failure
      and masked the non-zero exit, so a commit went through on a red suite.
      Never reproduced since: ~20 full-suite runs including 3 concurrent with a
      build, 10 focused runs of every jsdom file, and a clean run on merged
      main. The failing run took 13.2s vs a normal 4.5s, so CPU contention is
      the likely cause — but it is NOT proven benign, just unreproduced. If it
      recurs, capture the full output; never pipe a test run through `tail`.
- [ ] Color picker — the disc's size lives in two places: `RADIUS = 118` in
      `ColorDisc.tsx` and `.pick-disc { width: 236px }` in `app.css`. Both sides
      carry sync comments and it is safe today only because the disc is a fixed
      size (RADIUS places the pin's initial position; the drag path measures the
      real element). The moment anyone makes the disc responsive — which is the
      natural follow-up to the short-viewport overflow fix — the pin will
      desync from the wheel. A `--pick-disc-size` token consumed by both, or
      measuring on mount, would close it. Fix this BEFORE making the disc
      responsive, not after.
- [ ] Color picker a11y and naming polish, none blocking:
      • The wheel's arrow-key changes are silent to a screen reader — it is a
        `role="group"` with `tabIndex=0` and no `aria-valuenow`, so nothing is
        announced as hue/saturation move. The three text fields are the
        accepted accessible path (per the spec), but a proper slider role with
        announced values would be better.
      • The picker labels its field `Hex` while the color detail page labels
        the same concept `HEX`; CSS uppercases both, so it only differs for
        screen readers. Pick one.
      • One control has three names — `ColorDisc` in code, `.pick-*` in CSS,
        "the wheel" in the copy.
      • `ColorDisc` never explicitly releases pointer capture, relying on the
        Pointer Events spec releasing it on pointerup. Standards-correct and
        works, but an explicit `onPointerUp`/`onLostPointerCapture` would be
        more defensive.
- [ ] Small code cleanups in the v1.4.0 work, all deliberately left:
      • `ColorFields` uses `if (next) onChange(next)` where `next !== null`
        would say what it means (RGB tuples are always truthy, so it is correct
        today).
      • `rgbToHsv` duplicates the hue-sector logic already in `rgbToHsl` in the
        same file (~5 lines). Judged not worth a shared helper for two callers,
        since the surrounding saturation math differs — revisit only if a third
        HSx variant ever appears.
- [ ] Process: git tags do NOT travel with `git push` unless pushed explicitly.
      `v1.3.2` was tagged locally and sat unpushed for weeks without anyone
      noticing, and `v1.3.3` was never tagged at all; both were repaired on
      2026-07-28. Consider `git config --global push.followTags true` so
      annotated tags ride along with the branch push automatically.
