# Personal color analysis — photograph your face, get your colors

**Date:** 2026-07-28
**Status:** approved, ready for implementation plan
**Mockups:**
`docs/superpowers/specs/2026-07-28-personal-color-harmony-comparison.html` and
`docs/superpowers/specs/2026-07-28-personal-color-result-layout.html` — both
rendered from the real 157-color dataset, not from placeholder swatches, with
the chosen option outlined.

## Why

The site can already start from a color you *have* — sampled from a camera, an
uploaded photo, or picked on the wheel. It cannot start from **you**. The owner
asked for the missing doorway:

> yes i do want the ability (probably a new tab) that allows the user to take a
> photo of their face and then we pick out good matching colors from this
> pallete to go with their face. it's almost a combination of all the other
> features of the site that allow you to find a pactifular color, but now we are
> using the user's face to filter colors by hue, group, color. maybe we prompt
> the user to hold up a piece of white paper around their face so we can use it
> as white balance.

and, on the output:

> i'd also like the results to reutrn the seasonal anslysis as well.

## What changes

A fourth view — **You** — joins Wheel / Match / Browse in the header. It
captures a photograph, measures three things about the person's coloring, and
presents two palettes drawn from the book's 157 colors, plus the combinations
that suit them. The existing → Match and → Browse doorways carry the result into
the rest of the site.

Nothing about the wheel, Browse, Match, the sampler, or the accessibility
goggles changes.

**The tab name is provisional.** *You* is short, sits comfortably beside
Wheel / Match / Browse, and needs no explanation. *Your colors* and *Mirror*
were the alternatives. Owner's call; it is one string in `Header.tsx`.

---

## The dependency budget, restated

This feature needs face detection, which the old budget forbade. The owner
reopened the rule:

> let's think about the constraints for this app. we can use external libraries,
> but it needs to still run on github pages (static site). so let's do a pass of
> all the tools that the current site sues and if we need packages loaded to run
> we can allow it. the original constraight was to make it so the app runs and
> launches easily, but i may have been tto strict in my words.

The audit that followed found the real constraint was never "four packages" — it
was four properties. **`CLAUDE.md` must be updated in the implementation commit**
to replace the package whitelist with these:

1. **Builds to static files.** No server, no API, no request-time work. GitHub
   Pages serves the output as-is.
2. **`make install && make dev` just works.** npm only — no native compilation,
   no Python, no separate model-download step.
3. **Nothing user-derived leaves the device.** Any asset must be self-hosted
   from our own origin. A third-party CDN request is a leak even when it carries
   no payload, because it reveals that the visitor is on this page.
4. **Weight is paid by the feature that incurs it.** Anything large must
   lazy-load on entering its tab, never in the main bundle.

The current bundle is 397 KB of JS and 23 KB of CSS. That budget is unchanged by
this work; the new weight sits behind the tab.

### The dependency being added

**`@mediapipe/tasks-vision`** — Apache-2.0, **zero transitive dependencies**,
inference runs entirely on-device. Measured, not estimated:

| Asset | Size |
|---|---|
| JS wrapper | 40 KB gzipped |
| `vision_wasm_internal.wasm` | 3.23 MB gzipped (11 MB raw) |
| `blaze_face_short_range.tflite` | 0.22 MB |
| **Total, lazy-loaded on entering the You tab** | **~3.5 MB** |

The browser-native `FaceDetector` API was rejected: still flag-gated, Chrome and
Edge only, never implemented in Safari or Firefox. Hand-rolled YCbCr skin-chroma
segmentation was rejected too — it adds no bytes, but its thresholds
under-detect deeper skin tones, which is a disqualifying failure mode for a
feature whose entire output is a judgement about the user's skin.

The **Face Landmarker** model (478 landmarks, 3.58 MB) was considered and not
taken. It would allow a true skin mask — the face oval minus eyes, brows, lips
and nostrils — instead of probe patches placed by proportion. It costs 3.4 MB
more and initialises more slowly on a phone. Because `src/face/detect.ts` is the
only file that touches MediaPipe and returns a normalised geometry object, the
upgrade is contained to that one file if probe placement proves unreliable in
practice.

### Build wiring

A small script in `scripts/` copies the WASM and the `.tflite` from
`node_modules` into `public/mediapipe/`. It runs from `make install` and before
`make build`. No new dependency, and the assets are served from our own origin,
satisfying constraint 3. `Makefile` and `README.md` must document the step.

---

## The flow

1. **Choose a source** — camera, or upload a photo. The two doorways the sampler
   already has.
2. **Frame up.** An oval guide for the face, with one line of instruction:
   *hold something white next to your face — paper, a mug, a wall, a t-shirt.*
   There is no fixed box to aim the white object into.
3. **Capture.** BlazeFace locates the face. Probe patches are placed by
   proportion from the bounding box and the six keypoints — forehead, both
   cheeks, jaw, and a band above the head for hair. Separately, a white
   reference is proposed: the frame is scanned on a coarse grid **outside** the
   face box for the patch with the highest L\* among those below a low chroma
   ceiling, rejecting any patch that is clipped (any channel at 255) or too
   dark to be a lit white. If nothing qualifies, none is proposed.
4. **Check what we read.** The patches and the colors taken from them are shown.
   Anything wrong can be corrected by tapping the real cheek, hair, or white
   object. The white reference can be dismissed outright with *there's nothing
   white in this shot.* **This step is not optional and not skippable** — it is
   what stops the feature being a black box.
5. **The result page.** Season name with an override, two palettes, ranked
   combinations, and the → Match / → Browse doorways.

---

## What is measured

Three axes, from two sampled colors.

| Axis | From | How |
|---|---|---|
| **Undertone** — warm / neutral / cool | skin | CIELAB hue angle. Above 55° warm, below 48° cool, between them neutral. |
| **Depth** — light / medium / deep | skin | L\*, reported alongside ITA° (`arctan((L*−50)/b*)`), the standard dermatological measure. |
| **Contrast** — high / medium / low | skin + hair | `abs(L*skin − L*hair)`. Above 40 high, below 22 low. Drives the *clear / soft / muted* wording. |

**Contrast survives a bad white balance; undertone does not.** Contrast is a
ratio measured within a single photograph, so a wrong white point largely
cancels. Undertone is an absolute hue judgement and is destroyed by one. This
asymmetry is why the no-white-reference path is still worth showing, and exactly
what the page must disclose when it happens.

**Robust sampling.** Each probe yields many pixel samples. Samples that are
clearly not skin — too dark, too saturated, too far from the group — are
discarded, and the median of the remainder is taken. A stray eyebrow or shadow
pixel cannot move the reading.

---

## Palette one — measured (the rules)

Every one of the 157 colors is scored against the person's own numbers. These
constants were run against the real dataset to produce the mockups; they are
starting values and every one is a dial.

| Rule | Constant |
|---|---|
| **Undertone agreement** | A color's temperature is `cos(hue − 60°)`, +1 fully warm to −1 fully cool. Warm person keeps ≥ −0.15; cool keeps ≤ +0.15; neutral keeps all. |
| **Separation from skin** | Keep only colors at least **15 L\*** from the skin reading, so the face never melts into the garment. |
| **Chroma matched to contrast** | High contrast → chroma 22–75. Medium → 14–55. Low → 6–38. |
| **The sallow band** | Rejected for everyone: hue 70–100° below chroma 25 (dull yellow-greens), and hue 300–340° below chroma 15 (greyish mauves). |

Each kept color carries the sentences explaining why, and the page shows them —
*"deeper than your skin by 31 — your face stays distinct."* That traceability is
the reason this method was chosen:

> i am leaning towards way 1 because there's provinance on how the values are
> picked

---

## Palette two — the season list

The owner also wanted the traditional output, so the result is usable by someone
who has had a professional consultation:

> but i would like it to still try to guage the person's 12-color summary. this
> way it's still usable with someone who has done an official color analysis.
> either that or we provide both ways.

Shown a worked comparison of both methods over the real dataset, the owner chose
to ship both:

> i actually liked how you showed both side by side. this lets everyone explore
> different views

**These twelve palettes have no published source. They are our invention.** That
is a real cost of shipping this palette, and it is not to be papered over. The
About text and the result page must both state plainly that the measured palette
comes from the visitor's face while the season palette comes from a table we
wrote. Precedent: the accessibility goggles ship *Print & B&W safe* rather than
claiming true CMYK proofing.

### The mapping is data, not code

> maybe we create a separate dataset that maps color to season. this way i can
> easily change it or have another agent analyze it. and it'll update in the
> website.

The season→color mapping lives in **`data/curated/seasons.json`**, hand-editable
and read directly by the app. Editing the file and refreshing the page changes
the palettes; no code change, no regeneration step.

This is the right shape for the honesty problem. The one part of this feature we
admit is invented becomes the part that is easiest to inspect, diff, review and
correct — a reviewer can audit twelve lists of color names against published
sources without reading a line of TypeScript.

```json
{
  "schemaVersion": 1,
  "note": "Hand-curated. No published source — see the spec.",
  "seasons": [
    {
      "id": "deep-autumn",
      "name": "Deep Autumn",
      "undertone": "warm", "depth": "deep", "chroma": "clear",
      "colorIds": [12, 44, 91]
    }
  ]
}
```

- **`colorIds`** are ids from `colors-data.json`. Membership is many-to-many —
  a color may appear in several seasons, as it does in practice.
- **The `undertone` / `depth` / `chroma` triple** is how a measured reading finds
  its season. Classification stays in code because it is derived from
  measurement; *membership* is data because it is curated.
- **Seeded once, then owned by hand.** `scripts/seed-seasons.ts` generates the
  first version from the hue/L\*/chroma regions used in the mockups, and the
  output is committed as data. The script stays in `scripts/` for regeneration
  but is not part of the build — after seeding, the file is edited, not
  regenerated.
- **Validated like the main dataset.** A schema check plus: every `colorId`
  exists, all twelve seasons are present with unique ids, every
  undertone/depth/chroma combination the classifier can produce maps to exactly
  one season, and no season is empty.

**This amends an architecture rule.** `CLAUDE.md` currently says the app reads
ONLY `data/processed/colors-data.json`. It now reads two files: that one, plus
`data/curated/seasons.json`. The distinction the rule protects is preserved and
worth restating in `CLAUDE.md` — `data/processed/` is *generated* from a vendored
source and must never be hand-edited; `data/curated/` is *authored* by us and
never generated. Source-format knowledge still lives only in `scripts/ingest/`.

### Season override

> **Decision:** our classification is a pre-selected default in a dropdown of
> all twelve, not a verdict.

Someone told "Soft Summer" by an analyst switches to it and gets that palette.
This also defuses the weakest link in the chain: in the worked example the
classifier put a light, cool, high-contrast face in *Clear Winter*, which a real
analyst would likely dispute. With the dropdown, a shaky guess is a one-click
correction rather than a wrong answer.

---

## The result page

**Layout B — one palette at a time, switched by a segmented control.** Both
palettes were mocked side-by-side against real data and rejected:

> let's go with layout B where it's a toggle. i can see how it can be a bit
> overwhelming if there's a lot of colors in the measured for you bit. we can
> always change it later into the single column view

The deciding argument: this is a camera feature, so the phone is the primary
case, and on a phone two columns collapse to a stack — the second list ends up
below the fold with no affordance to reach it, which is Layout B without the
switch. The reversibility the owner notes is real; the two layouts differ only
in the result page's own markup.

Top to bottom:

- **The reading** — skin and hair swatches, the three axes in words with their
  numbers beneath, and a badge: *✓ white-balanced* or *~ rough reading*.
- **The season row** — the dropdown, defaulted to our guess.
- **The toggle** — `Measured for you · 53` / `Deep Autumn (traditional) · 18`.
  The second tab is labelled *(traditional)* so a visitor who lands there
  cannot mistake where it came from.
- **A provenance line**, always visible, differing per tab, with a link to the
  fuller explanation.
- **The colors**, full width, each named.
- **The combinations** (below).
- **The doorways** — → Build a palette, → Browse these.

### Combinations: rank, then floor

Requiring every color in a combination to be the visitor's is far stricter than
it sounds. Measured against the real data, it yields **13** of 338 displayable
combinations for a 53-color palette, and **1** for an 18-color season list.

"Dominant color is yours" was proposed and withdrawn — **the dataset has no area
proportions.** `colorIds` is stored in ascending id order and the taper in
`PlateCard.tsx` is decorative, so "largest color" would mean "lowest id", which
is meaningless. (Already logged in `TODO.md` as an open research question.)

The owner's resolution:

> we should rank but have the abilty to have a slider that sets a filter lower
> boundry

Combinations are **ordered** by what fraction of their colors are the visitor's,
strongest first, and a **four-stop floor control** decides where the list stops.
Discrete stops, not a continuous drag: combinations hold 2–5 colors, so the
fraction only takes a handful of values and a smooth slider would have dead
zones. It reads like the size chips already on the site.

| Stop | Measured (50) | Deep Autumn |
|---|---|---|
| Every colour is yours | 12 | 1 |
| All but one | 117 | 38 |
| **Half or more** *(default)* | **143** | **42** |
| Anything with a match | 234 | 103 |

> **Corrected during implementation.** These first appeared as 53 colours and
> 13/118/148/239, computed by the throwaway mockup script using its own
> hand-rolled sRGB→Lab conversion. The shipped code uses culori, as the project
> rule requires, and the three colours that moved all sit within 0.6 of a
> threshold (Carmine Red at 14.81 separation, Red at 14.86, Artemesia Green at
> 14.72, against a cutoff of 15). The argument is unchanged — strict filtering
> still guts the list — but the numbers now match what the code actually does.
> Pinned by `tests/combinationMatch.test.ts`.

Colors in a plate that fall outside the palette are outlined, so the visitor can
see exactly which accent isn't theirs.

### A disclosure the page owes the visitor

**Wada's palette leans warm: 109 of its 157 colors read warm against 48 cool.**
Cool-toned visitors will therefore get a structurally smaller personal palette
than warm-toned ones, whatever the method. That is a property of a 1930s
Japanese color book, not a bug in the analysis, and the page must say so — an
unexplained short list otherwise reads as a failure.

---

## Architecture

The governing constraint: **every layer testable without the one above it**, and
MediaPipe reachable from exactly one file.

| Module | Job | May depend on |
|---|---|---|
| `src/face/detect.ts` | **The only file importing MediaPipe.** Lazy-loads the model; returns a plain `FaceGeometry` — bounding box, both eyes, nose, mouth, both ears — or `null`. | `@mediapipe/tasks-vision` |
| `src/core/facePlan.ts` | Pure geometry. `FaceGeometry` + image dimensions → probe rectangles. No color, no browser, no library. | nothing |
| `src/core/robustSample.ts` | Pure statistics. Many samples in, one trustworthy color out: outlier rejection then median. Extends `sampling.ts`. | nothing |
| `src/color/skinMetrics.ts` | White-balance correction, then Lab / OKLCh / ITA° → the three axes. | culori |
| `src/color/personalPalette.ts` | The four rules. Scores all 157 colors, returns keeps with reason sentences. | culori |
| `src/core/seasons.ts` | Loads and validates `seasons.json`; classifies a reading's undertone/depth/chroma triple to a season id; returns a season's colour ids. Pure — the palettes are data, so no colour science is needed here. | nothing |
| `src/core/combinationMatch.ts` | Fraction-of-combination-that-is-yours; ranking and the floor. Pure set arithmetic, no color science, so it belongs in the kernel. | nothing |
| `src/components/sample/FaceCapture.tsx` | Camera/upload, guide overlay, capture. Inside the privacy guard. | — |
| `src/components/sample/ProbeReview.tsx` | Show the patches; tap to correct. | — |
| `src/components/you/YouView.tsx` | The result page. | — |

`src/face/` is a new non-core layer, mirroring how `src/color/` isolates culori
so `src/core/` stays a dependency-free kernel. **`tests/core-purity.test.ts` is
not weakened.**

Two alternatives rejected: calling the detector directly from the capture
component (couldn't swap the model without touching UI, and probe placement
couldn't be tested without a browser), and putting Lab math in `src/core/`
(hand-rolling color science, which the project rule exists to prevent).

### State

`AppState` gains `view: 'you'` and:

```
you: {
  reading: {
    skin, hair,              // hex strings
    undertone, depth, contrast,
    skinL, skinHue, ita, contrastGap,
    whiteBalanced            // boolean
  } | null,
  season: SeasonId | null,   // null = use our guess
  floor: 0 | 1 | 2 | 3       // 0 every colour · 1 all but one · 2 half or more (default) · 3 any match
}
```

Numbers and short strings only — still one serializable object, as the
architecture rule requires. **The photograph never enters app state.** It lives
in a canvas for the duration of the capture and is discarded.

---

## Errors and edge cases

| Case | Behavior |
|---|---|
| No face found | Fall back to the manual oval — the visitor taps their own cheek and hair. The feature never dead-ends on a model that didn't fire. |
| No white object / dismissed | Proceed. Result badged *~ rough reading*, undertone marked unverified, with a *Retake with something white* button. |
| Hair not visible — hat, shaved head, cropped frame | *No hair visible* path: contrast is derived from skin alone and the page says the contrast reading is weaker. |
| White reference blown out or in deep shadow | Treated as unusable; same path as no white object. |
| Camera denied or absent | The camera tile is hidden exactly as `cameraSupported()` already governs it; upload remains. |
| Model fails to load — offline, blocked | Clear message plus the manual-tap fallback. The tab never shows a dead spinner. |
| Very small face in frame | Probes would be a few pixels; below a minimum box size we ask the visitor to move closer. |

---

## Privacy

The owner made this explicit:

> i like the ability you're not capturing the photo for privacy. let's make sure
> that's documnted in the readme as a privacy statement.

Guarantees, all enforced by test rather than asserted in prose:

- The photograph is **never uploaded**, **never saved**, and **never enters app
  state**. Only derived numbers survive the capture.
- Face detection runs **on the device**, from files served by this site. No
  third-party request fires at any point.
- `tests/sample-privacy.test.ts` is **extended, not weakened**: the existing ban
  on network and storage APIs across `src/components/sample/` continues to
  apply, and a new assertion covers `src/face/` — no absolute `http(s)` URLs, so
  the model can never be silently repointed at a CDN.
- `README.md` gains a **Privacy** section of its own, in the manner of the
  Analytics section, stating all of the above in plain language.

---

## Testing

- **Pure, unit-tested:** probe placement from a known geometry; outlier
  rejection and median; white-balance correction; the three axes from known
  skin/hair pairs; the four rules against fixture colors; season classification;
  combination ranking and each floor stop.
- **`seasons.json` validated by its own test**, in the manner of
  `tests/validate.test.ts`: schema, every `colorId` resolves, twelve unique
  seasons, no empty palette, and every undertone/depth/chroma triple the
  classifier can emit maps to exactly one season. This is the test that catches
  a bad hand-edit — the file is meant to be edited, so the guard matters more
  here than for generated data.
- **Fixtures across the tonal range.** Skin readings spanning light to deep and
  warm to cool, so a regression that degrades deeper tones fails the suite.
  Given the reason we rejected chroma-threshold segmentation, this is a
  correctness requirement, not diligence theatre.
- **DOM:** `FaceCapture` and `ProbeReview` under jsdom with a mocked detector,
  following `tests/helpers/mockCamera.ts`. The detector seam is mocked — no WASM
  in the test run.
- **Guards:** core purity, sample privacy (extended), analytics — all unchanged
  in spirit and none weakened.
- **Owner browser checklist:** a real face in real light, with and without a
  white object; a deep skin tone and a light one; hat/no hat; the no-face
  fallback; the tab on a 375px phone.

---

## Documentation (the CLAUDE.md contract)

- `README.md` — a **You** entry under Features, the new **Privacy** section, the
  `public/mediapipe/` copy step in setup, and a short note on how to edit
  `data/curated/seasons.json` (written for a non-JS reader, since editing it is
  the one maintenance task this feature hands the owner).
- `CLAUDE.md` — the dependency budget replaced by the four properties above;
  `src/face/` added to the architecture rules; the data rule amended to name
  `data/curated/` alongside `data/processed/`.
- `Makefile` — the asset-copy step, working.
- `PROMPTS.md` — this session's prompts verbatim and the decisions made.
- `CHANGELOG.md` — release entry paired with the owner's guiding prompts.
- `TODO.md` — the deferrals below.

## Out of scope — deferred to `TODO.md`

- **The Face Landmarker upgrade** (478 landmarks, true skin mask). Revisit if
  proportional probe placement proves unreliable on real faces.
- **Eye color** as a fourth input. Too small and too specular to sample
  reliably without landmarks.
- **Saving or sharing a reading.** Deliberately excluded, consistent with the
  camera storing nothing.
- **A site-wide "Suits me" lens** in the accessibility goggles menu. The owner
  chose a self-contained result page first; the goggles filter combinations
  while this filters colors, so it is not a drop-in.
- **Tuning the four rule constants through UI.** They ship as constants. Note
  the asymmetry this creates and accept it: the *season* palettes are editable
  data, the *measured* rules are code. That is deliberate — the rules are
  derived from the reading and are meant to be defended, while the season lists
  are curated and are meant to be revised.
- **An in-app editor for `seasons.json`.** It is a file in the repo; editing it
  is a git operation, not a site feature.
- **Researching Wada's true plate area ratios** — already logged; would unlock a
  genuine "dominant color" rule.

## Version

Ships as **v1.5.0** — a minor release. A new tab and a new dependency, with no
change to any existing behavior.
