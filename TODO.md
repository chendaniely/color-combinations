# TODO — deferred ideas (so nothing gets forgotten)

Move finished items to TODO-completed.md with the commit hash.

The v1.6.0 consolidation pass (2026-07-29) cleared the defect half of this
file; everything below is either a genuine idea, a known limit we accepted, or
a check that needs a person. See `TODO-completed.md` for what went.

## The biggest open question

- [ ] **The site has no way to keep anything you make.** Everything the *book*
      produces can be taken away — a combination has PNG export and hex/CSS/
      JSON copy. Nothing the *visitor* produces can be. There is no save, no
      name, no export for a palette built on Match, and nothing at all in
      `src/` touches `location` or `history`, so **no screen on this site can
      be linked to.** Someone finds their season and the only way to show a
      friend is to make them redo the photo.
      Raised on 2026-07-29 when the owner asked whether the features were
      exhausted; the answer was that the front doors are, but the back half of
      the ones we have is missing. Deep links are cheap here specifically
      because app state is one serializable object — that decision was made
      *for* this. Two pieces, buildable separately:
      • shareable deep links (serialize the state object into the URL);
      • save / name / export a built outfit palette.

## Deferred from v1.7.0

- [ ] **The lens dropdown.** A control at the top reading "viewing the book
      through: [Deep Autumn ▾]", where Browse dims non-members, the wheel
      emphasises member ribbons, and plates carry a fit badge. Owner asked for
      it on 2026-07-29 — *"if i have a drop down on the top that allows you to
      pick a color combination and the entire site reacts to the new set of
      colors?"* — and chose to ship the datasets first. The schemas were
      designed for it: a lens is a named subset of the corpus with a score per
      colour, which is exactly what `season-colors.json` already is. Seasons
      would be the first lens; a sampled photo, a saved palette and an
      accessibility filter are the obvious next ones.
      NOT the same thing as swapping the corpus, which was considered and
      rejected: 22 modules read `combinations`, and no other published colour
      book has any. See the reframe in
      `docs/superpowers/specs/2026-07-29-pccs-season-datasets-design.md`.

- [ ] **The hue mapping is the weakest link.** `src/color/pccsMap.ts` anchors
      the PCCS circle on the sRGB primaries as stand-ins for the psychological
      unique hues. It is documented as an approximation and is the first thing
      to revisit if the seasons ever look wrong at the blue-green end.

## Owner's next feature idea

- [ ] **Match > Colors is empty, and the ways to find a colour should live
      there.** Owner, 2026-07-29: *"i think the sample a color next to the find
      a color should also appear as different card/'apps' under the match >
      colors feature. there's nothing tehre right now, and the options we have
      to find a color, and the sample a color shoudl all fit in this section."*
      Today the Colors level of Match shows only a line of text — "Search a
      colour name above, or snap a colour with the camera" — pointing at
      affordances that live in the header. The four ways in (search by name,
      camera, upload a photo, pick a colour) should be cards on that empty
      panel, the same way `ColorSampler` already presents three of them.
      Worth noting the pieces exist: `ColorSampler` renders exactly this card
      list, so this is likely a matter of surfacing it inline rather than only
      inside the overlay, plus a name-search card. Open questions: does picking
      a source open the existing overlay or work inline, and does the same
      block belong on Browse's empty state too.

## Needs a person, not a test

- [ ] **The You tab has still only ever seen ONE face.** The scoring rules were
      tuned against fixtures spanning light to deep and warm to cool, but only
      one real person has used it. A deep skin tone and a light one, side by
      side, is still the check that matters most. This is a feature whose
      entire output is a judgement about skin, and the reason we rejected the
      zero-dependency approach was that it degraded on deeper tones — so this
      is a correctness question, not politeness.
- [ ] **Owner browser checklist**, deferred repeatedly and still worth doing by
      eye. Some of it is now automated by `make test-browser`; these are the
      parts that are not: per-level arc counts on the wheel at all 4
      granularities; the hover dim + centre label (rebuilt 2026-07-20 — is the
      flicker gone, does the dimming read right); the crossfade between
      granularity levels; the size-chip filter live toggle; PNG download for
      the 5-colour No. 331 specifically (longest name — check it doesn't
      overflow the canvas; that a PNG downloads at all is now tested); the
      mobile touch-scrub on the wheel (press/drag to preview, LIFT to open —
      confirm
      hold-drag-then-lift opens the right combo, a quick tap still opens first
      time at all 4 granularities, dragging off past the wheel's edge and
      lifting cancels, and the page never scrolls under the drag); and a
      product call on whether colours with zero combinations reading as
      zero-width arcs at the Colors level is acceptable — measured
      2026-07-29, this affects exactly ONE colour of 157 (Vandar Poel's
      Blue, #127), so it is a curiosity rather than a systemic gap.
- [ ] You tab (v1.5.0) — owner review passed with "anything else are smaller ui
      element changes i can fix later on"; those specific tweaks were never
      enumerated. Add them as they come up.

## Sharing

- [ ] **A shared link shows nothing.** `index.html` now has a description, but
      no Open Graph or Twitter card tags, so pasting the URL into Slack,
      iMessage or a social post produces a bare link with no preview image —
      for a site that is entirely about colour. Deliberately not added blind:
      a card wants a 1200×630 image, which is a design asset the owner should
      approve rather than something to generate unattended. Cheap once that
      exists: four meta tags and a file in `public/`. Pairs naturally with the
      shareable-deep-links item at the top of this file, since a link worth
      sharing and a preview worth seeing are the same feature.

## Curated data worth a second opinion

- [ ] **The season palettes are still lopsided, but for a different and better
      reason.** This entry used to describe hand-curated lists in
      `data/curated/seasons.json`, a file v1.7.0 deleted. Re-measured
      2026-07-29 against the computed data: sizes now run **15 to 57**, a 3.8×
      spread (was 7 to 35, 5×). Membership is per-PARENT, so the three
      sub-seasons of a season share a pool: Summer 15, Autumn 18, Spring 44,
      Winter 57.
      The cause is now structural rather than editorial, which is progress —
      it can be reasoned about. Summer gets 15 because its PCCS tones are the
      muted ones (`lt, p, sf, d`) and the book holds eleven usable muted
      colours. Winter gets 57 because its tones include the vivid and deep ones
      and the cool half of the hue circle has 14 of the 24 hues.
      Two dials exist if this is worth rebalancing, both in
      `data/curated/season-rules.json` and neither requiring TypeScript: the
      warm/cool hue split (currently 10 warm to 14 cool, and OUR judgement), and
      each parent's tone set (currently sourced, so changing it needs a reason
      better than balance). Prefer leaving it: the imbalance is a true fact
      about a 1933 pigment book, and the fit panel now says so out loud.

## You tab — known limits

- [ ] The selfie preview is not mirrored, so you appear the wrong way round
      versus a mirror. Convention is to mirror the PREVIEW only and never the
      captured frame (mirroring the capture would flip the probe geometry).
      A UX change, not a defect.
- [ ] The hair probe is a single point at 0.92 of eye-to-chin. Owner at 0.88:
      "it's RIGHT at the hairline". A sturdier approach is to sample a short
      vertical strip and take the darkest reading, so the result stops
      depending on one constant being right for every head. (The v1.6.0 guard
      now *detects* when this lands on skin — it does not stop it happening.)
- [ ] The automatic white reference picks the brightest near-neutral patch
      outside the face box, which can be a lit wall rather than the object the
      visitor is holding. Mitigated by the marker and the sliders, but the
      auto-pick itself has never been checked against a real photo.
- [ ] White balance is von Kries per-channel scaling, not a full chromatic
      adaptation transform. Against a simulated illuminant it is excellent
      (worst ΔE 0.95), but that model cannot account for a phone's own tone
      mapping, which applies a non-linear curve before we see any pixels.
      Real-world accuracy is therefore worse than the test numbers.
- [ ] The full-frame white-balance repaint (~1.4M pixels through a lookup
      table) has been reasoned about but never profiled on a phone. If dragging
      the temperature slider feels laggy, downscale the preview canvas.
- [ ] `tests/probeReview*.test.tsx` still cannot catch geometry bugs — jsdom
      does no layout. `make test-browser` now covers the general case (it
      asserts `.probe-stage` cannot be flex-shrunk, which was the 2026-07-28
      37px tap-misalignment bug), but not a full capture→tap→sample round trip,
      which would need a committed face photo fixture. Decide whether that is
      worth the repo weight and the privacy optics.

## Features not built

- [ ] PWA: installable web app. The camera capture shipped long ago; only the
      manifest / service worker / home-screen install remain.
- [ ] Camera doorways on the Match and Browse tabs — the reusable boundary
      (`ColorCapture` / `nearestColors` / `ColorMatches`) already exists;
      wiring an icon into those two tabs is a different result-callback.
- [ ] Better camera-capture UX (v1.1.1 shipped explicit 2-step text as a
      stopgap): the freeze-then-tap flow isn't self-evident — people expect the
      centre to be auto-selected and read the frozen photo as "stuck". Options:
      a default centre sample the user can override; an on-frame crosshair;
      a one-tap "use the centre" shortcut.
- [ ] Live "eyedropper" sampling (continuous colour-under-cursor while the
      camera is live) — v1 deliberately chose freeze-then-tap for accuracy.
- [ ] Multi-point / region-average or pattern (multi-colour) detection from a
      capture — v1 samples one tapped point.
- [ ] ΔE2000 (or another) colour-difference metric — the default is OKLab
      Euclidean via culori, and swapping is a one-file change in
      `src/color/colorDistance.ts` (culori already ships `differenceCiede2000`).
- [ ] Browse page — plot all 157 colours on a hue/saturation disc with a
      brightness slider that slices to the colours at that lightness (owner:
      "i liked how you can plot all the points and then also points in same
      brightness"). Open questions: does clicking a dot filter Browse, how does
      it interact with the goggles, what does it do on a phone. Starting point:
      discs B and D in `docs/superpowers/specs/2026-07-27-color-picker-disc-mockup.html`
      (whose saturation bug was fixed in v1.6.0, so it is now safe to copy).
- [ ] Match page: pin an exact colour per shade in a built palette (build is
      shade-level today).
- [ ] Match page: super-group (Groups) level — currently Colors, Shades and
      Families only.
- [ ] Outfit / website mockup previews using a chosen combination.
- [ ] Native iOS/Android app reusing `src/core/` and the processed data.
- [ ] A genuinely-different-dataset selector (a second colour book) — retired
      for the goggles feature but valid future work; needs a dataset registry.
- [ ] Fancy shared-element morph animation between granularity levels (v1
      ships a crossfade).
- [ ] Research the book's true plate area ratios. Now doubly worth doing: the
      v1.6.0 copy fix had to tell visitors the bar heights mean nothing,
      because the source has no proportions. A real source would let the plates
      say something true instead.
- [ ] README screenshot/GIF of the wheel — skipped because screenshots go
      stale; revisit once the UI settles.
- [ ] *(Not planned — logged so it isn't "helpfully" re-proposed.)* Camera
      capture history / saved colours — deliberately excluded for privacy; the
      camera stores nothing, see `tests/camera-privacy.test.ts`.
- [ ] *(Not planned.)* Do NOT add the book-colour overlay to the picker disc.
      It was mocked up live against all 157 colours and rejected: on a control
      whose job is aiming at a colour, the dots compete with the target. The
      plot belongs on Browse (above), not here.

## Accessibility goggles

- [ ] APCA / WCAG-3 perceptual-contrast lens (v1 uses WCAG 2 luminance
      contrast + OKLab-under-CVD).
- [ ] A separate tritan (blue-yellow) option and/or a severity control (v1
      covers protan + deutan at severity 1).
- [ ] A UI control to tune `CVD_THRESHOLD` (v1 ships the constant 0.10).
- [ ] Consider unifying the goggles control with the size chips into one filter
      bar (v1 keeps them adjacent but separate; size chips are OR within a
      dimension, goggles are AND across dimensions).

## Analytics

- [ ] Visible in-page analytics disclosure — v1.3.3 documented it in the README
      only. A footer line ("This site uses Google Analytics") was offered and
      declined; it needs a footer component and a tokens pass, since there is
      no footer today.
- [ ] Cookie-consent banner — deliberately skipped. Only worth building if
      EU/UK visitors start to matter, since GA sets cookies before consent is
      asked. Would also need the tag to load *conditionally*, which the current
      build-time injection doesn't do.
- [ ] Custom analytics events (wheel clicks, palette builds, exports) — v1.3.3
      is page views only, on purpose. Add one only when there is a specific
      question worth answering, not for a dashboard's sake.

## Code and process

- [ ] Revisit wheel orientation/ordering later (owner: "we can always go back to
      the rotation, color order, and orientation at a later time"): options
      considered but not taken were an RYB primary-triangle wheel and a
      pure-hue Colors level. Current choice is family-order + red-at-12.
- [ ] Gradient source→target highlight strokes on wheel hover — the highlight
      stroke is currently the source-node colour only.
- [ ] One control still has three names — `ColorDisc` in code, `.pick-*` in
      CSS, "the wheel" in the copy.
- [ ] The colour disc is a two-dimensional control and ARIA has no role for
      one, so it is a focusable `role="group"` with its position announced via
      a live region. `make lint` flags this (disabled inline, with reasoning at
      the code). If a better pattern emerges — or if two paired sliders would
      genuinely serve screen-reader users better than the three text fields
      already provided — revisit.
- [ ] `make coverage` low spots worth a look, none alarming: `ColorSampler`
      (9% of functions — it is mostly routing between four child screens),
      `YouView` (8% of branches — the capture state machine), and
      `ImagePicker` (30% of branches — the file-load error paths). The logic
      layers underneath them are at ~100%; these are thin React shells, so the
      question is whether a browser test of each flow is worth more than
      mocking them into submission in jsdom.
- [ ] Process: git tags do NOT travel with `git push` unless pushed explicitly.
      `v1.3.2` sat unpushed for weeks and `v1.3.3` was never tagged; both were
      repaired on 2026-07-28. **`push.followTags` is now set repo-local**
      (2026-07-29), which covers this working copy. It lives in `.git/config`,
      which is NOT committed, so a fresh clone does not inherit it — set it
      globally (`git config --global push.followTags true`) if you want the
      habit everywhere. Left as the owner's call rather than changing a global
      setting unasked.
- [ ] Process: never pipe a test run through `tail` or `grep` alone — it
      truncates failures and can mask a non-zero exit. This is how the v1.4.0
      flaky test lost its name for months. Capture full output to a file.
