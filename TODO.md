# TODO — deferred ideas (so nothing gets forgotten)

Move finished items to TODO-completed.md with the commit hash.

**Order of work (owner, 2026-07-29):** bugs and tech debt first, then ONE
feature, then another debt loop before the next feature. Never a batch of
features. See "The release cadence" in CLAUDE.md for why.

The v1.6.0 consolidation pass (2026-07-29) cleared the defect half of this
file; everything below is either a genuine idea, a known limit we accepted, or
a check that needs a person. See `TODO-completed.md` for what went.

## The biggest open question — half answered

- [x] ~~**Shareable deep links**~~ — shipped in v1.8.0. Every screen has an
      address; the Back button closes a panel; a stale link explains itself. A
      link to a built palette is also, on a site with no accounts, the closest
      thing to saving one — so most of the second bullet below came free.
      A You link carries the SEASON and never the reading (owner decision;
      `tests/urlPrivacy.test.ts`), so the one thing still missing is a way to
      keep your own MEASURED palette: reloading means retaking the photo.
- [ ] **What is left of it: keeping your own measured result.** Everything the *book*
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
      • ~~shareable deep links~~ — done, v1.8.0;
      • ~~export a built outfit palette~~ — a share link does this;
      • NAMING and KEEPING a measured personal palette across a reload is the
        genuine remainder, and it needs storage rather than a URL — which is a
        privacy decision, not a plumbing one, given what the reading contains.

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
      rejected: most of `src/` reads `combinations` — 26 modules as of
      2026-07-29, and the count only grows — and no other published colour
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

## Known gap: Back does not close a full-screen overlay

- [ ] **On a phone, Back with the camera or picker open leaves the site.** There
      is no Escape key on a phone, these overlays fill the screen, and Back is
      what "cancel" means — so the most natural gesture does the worst thing.
      Found by probing on 2026-07-29. **Two implementations were tried and both
      reverted**, so a third attempt should start from what they taught:
      • *Push an entry per overlay, pop it on close.* Broke the capture flow.
        FaceCapture unmounts straight into ProbeReview, `history.back()` is
        asynchronous, and the queued pop landed AFTER the next overlay had
        pushed — closing the review screen the instant it opened.
      • *Pool one entry per RUN of overlays, module-level count, deferred pop.*
        Fixed the handoff, then lost to `urlSync`: its `replaceState` overwrites
        whatever entry is current, which is the overlay's, wiping the
        `{ overlay: true }` marker the cleanup keys off. Result was a dead entry
        and a Back press that visibly did nothing.
      The diagnosis is that `Overlay` and `urlSync` are fighting over the same
      history entry, so the fix is a SHARED OWNER for it — most likely urlSync
      learning that an overlay is open, rather than either side pushing
      independently. `Overlay.tsx` carries the same note at the code.
      Not attempted a third time mid-loop: three distinct failure modes on one
      issue is the signal to stop and design, which is what CLAUDE.md's
      debugging guidance says.

## Owner's queued ideas (2026-07-30)

- [ ] **The pencil icon should be a camera**, with a visible label. The pencil
      means "edit"; the button means "sample a colour". Owner: *"i think people
      will better grivitate to a camera knowing it's for a picture."* A bare icon
      is undiscoverable whatever the glyph, so the label does most of the work.
- [ ] **Match > Colors is a DEAD END, not merely undiscoverable.** Levels 1 and 2
      render a `ShadePicker`; level 0 renders a sentence pointing at affordances
      elsewhere. Owner: *"it only really populates after i come from the you page
      … on its own there's no way to get to a similar page."* Fill it with entry
      cards — search, camera, photo, wheel — extracted from `ColorSampler` so the
      overlay and the inline gallery share one component, feeding the existing
      `ColorMatches` hub. Do NOT change the default level: Shades has a working
      picker and 23 options against 157.
- [ ] **Browse should have season filters that work independently**, so it
      connects to the You tab without requiring it. Composes with the palette
      filter shipped in v1.8.2 — a season simply supplies the palette. Note the
      season data is code-split and currently loads only on the You tab.
- [ ] **Put the reading in a link**, so a measured palette is shareable.
      **This REVERSES the v1.8.0 privacy decision**, which the owner made
      knowingly after asking "is this really a privacy issue?" — the answer given
      was: mild, not serious, because the recipient can already see you and the
      fragment never reaches a server. Requires rewriting the README sentence
      that currently promises a link "does not contain your skin tone", the
      CLAUDE.md rule, and `tests/urlPrivacy.test.ts`. **Do not ship the change
      while the old promise still stands.** A note by the Share button saying the
      link includes measurements would make it an informed choice.
- [ ] The accessibility goggles are `position: absolute` and scroll away exactly
      as the corner seal did before v1.8.3. Not changed: it is a control rather
      than decoration, and pinning it costs phone screen space. Owner's call.

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
      granularity levels; the size-chip filter live toggle; the
      mobile touch-scrub on the wheel (press/drag to preview, LIFT to open —
      confirm
      hold-drag-then-lift opens the right combo, a quick tap still opens first
      time at all 4 granularities, dragging off past the wheel's edge and
      lifting cancels, and the page never scrolls under the drag); and a
      product call on whether colours with zero combinations reading as
      zero-width arcs at the Colors level is acceptable — measured
      2026-07-29, this affects exactly ONE colour of 157 (Vandar Poel's
      Blue, #127), so it is a curiosity rather than a systemic gap.
      **Struck from this list 2026-07-29:** the PNG caption overflow, now
      measured for all 338 combinations by `tests/browser/exportText.spec.ts`.
      Automating it corrected it too — the checklist named No. 331 as the
      longest, but No. 311 is longer (64 characters against 62), so checking
      the named plate by eye would never have found it. The answer is that it
      fits, with 85px of 1040px spare.
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
      exists: four meta tags and a file in `public/`. Now much more worth doing,
      since v1.8.0 made every screen linkable and people will actually paste
      links.
      **Ceiling, established 2026-07-29 and NOT a matter of effort:** hash
      routing makes PER-LINK previews permanently impossible. Everything after
      `#` is never sent to the server and crawlers do not run JavaScript, so
      every link will show the same card whatever screen it points at.
      Per-combination previews would need path-based URLs and a pre-rendered
      page per combination — a much larger build that would undo the simplicity
      making deep links cheap. One site-wide card is the maximum, and that is an
      acceptable trade.
      The image can be GENERATED rather than designed: `exportPng.ts` already
      renders 1200x900 plates, so a 1200x630 card from Wada's own colours is the
      same machinery pointed at a different canvas. Candidates for the owner to
      choose from is the next step, not a design brief.

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
- [ ] ~~ΔE2000 colour-difference metric~~ — **measured 2026-07-29, and there is
      no reason to switch.** Compared OKLab Euclidean against
      `differenceCiede2000` over a 512-point grid spanning the sRGB cube (what a
      visitor actually feeds in from a photo or the picker, not just colours
      already in the book):
      • the top-1 nearest colour differs on **34.2%** of queries;
      • but the top-12 SET overlaps **73.6%** on average.
      That first number sounds alarming and is not. Inspecting the
      disagreements, both metrics pick the same near colours and disagree only
      on the ordering among near-ties — for `#0000c0` both return Deep Lyons
      Blue, Violet and Red Violet, at CIEDE2000 distances of 4.9, 4.2 and 4.0.
      Reordering three candidates separated by 0.9 ΔE is not a better answer,
      and the UI shows twelve results with a very-close/close/roughly band, so
      the exact order inside a tight cluster is not load-bearing.
      Note for whoever revisits this: an earlier draft of this entry claimed
      CIEDE2000 was misbehaving in the blue region because it is fitted for
      small differences. The distances above disprove that for this dataset —
      they are all under 5. The formula is being used in range; it simply
      weights the same cluster differently. Do not repeat the stronger claim
      without re-measuring.
      Left open only because the seam exists and a future dataset with denser
      coverage might make the ordering matter. It is a one-file change in
      `src/color/colorDistance.ts` if so.
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
- [x] ~~One control still has three names~~ — resolved 2026-07-29 by renaming
      the CSS from `.pick-*` to `.disc-*` and the token from `--pick-disc-size`
      to `--disc-size`, so code and CSS now agree on "disc". **"The wheel" stays
      in the visitor-facing copy on purpose**: that is what people call a round
      colour control, and matching code names in the UI text would be the wrong
      fix. So it is two names now, one of them deliberately the user's word,
      which is as far as this should go.
- [ ] The colour disc is a two-dimensional control and ARIA has no role for
      one, so it is a focusable `role="group"` with its position announced via
      a live region. `make lint` flags this (disabled inline, with reasoning at
      the code). If a better pattern emerges — or if two paired sliders would
      genuinely serve screen-reader users better than the three text fields
      already provided — revisit.
- [x] ~~`make coverage` low spots~~ — question answered 2026-07-29: **the
      browser suite already covers all three**, and the low numbers are the
      known blind spot `vite.config.ts` documents rather than untested code.
      `ColorSampler` is exercised by eleven browser specs, `YouView` by six,
      `ImagePicker` by three — including the whole capture flow (upload, review,
      tap to sample, white-balance repaint, confirm to a reading and a palette)
      and the picker's modal behaviour. Mocking these shells into submission in
      jsdom would add assertions without adding coverage of anything real.
      Left as an answered question rather than deleted, because "9% of
      functions" will look alarming again to the next person who runs
      `make coverage`.
- [ ] Process: git tags do NOT travel with `git push` unless pushed explicitly.
      `v1.3.2` sat unpushed for weeks and `v1.3.3` was never tagged; both were
      repaired on 2026-07-28. **`push.followTags` is now set repo-local**
      (2026-07-29), which covers this working copy. It lives in `.git/config`,
      which is NOT committed, so a fresh clone does not inherit it — set it
      globally (`git config --global push.followTags true`) if you want the
      habit everywhere. Left as the owner's call rather than changing a global
      setting unasked.
- [x] ~~Process: never pipe a test run through `tail` or `grep` alone~~ —
      resolved 2026-07-29 by `make check`, which runs lint + test + build, tees
      the FULL output to `check.log`, and keeps the real exit code via
      `set -o pipefail`. The hazard was confirmed first: `make test | grep`
      reports exit 0 on a failing run. Verified the new target exits non-zero
      and captures both the `FAIL` line and the `AssertionError`. Use it
      instead of remembering the rule.
