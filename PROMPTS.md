# PROMPTS.md — the owner's prompts & decisions

Append-only chronological log. Someone should be able to re-create this
project from these prompts. Verbatim where practical (typos preserved).

## 2026-07-19 — Session 1: brainstorming & design

**Initial prompt:**

> let's plan in interactive website. i want to visualize the "A Dictionary
> of Color Combinations" you can get a JSON API of allt he colors with
> color codes here: https://sanzo-wada.dmbk.io/assets/colors.json
>
> what i want is an easy way to visualize the color combinations. maybe
> first in a ciruclar chord diagram of the different color combinations.
> maybe as 2, 3, and 4 the way the book has them.
>
> i also want the website to look good and fun and interactive.
>
> i'll tell you right now i don't know anythign about javascript, html, and
> css, this will be a fully vibe coded project. so leave yourself allt he
> contxt you eed, and ask me all the questions. Also provide a detailed
> README and Makefile that shoudl always be kept up to date.
>
> finally i'd like to deploy this as a github pages site. so it should be
> "static" let me know what other design ideas or constraignts you will
> have?
>
> one other thing i have for this color dataset is to group the colors
> together so all the different shades of pink, for exmaple, can be viewed
> as a single entity. so people can learn to create color combinations
> easier when things aren't perfect.
>
> some other ways i can see this tool being used is picking colors for a
> website, presetnation, etc, but also for picking out color combinations
> for what to wear. so the colors do not need to be exact, but the user
> shoudl be able to group colors in higher and highter groups

**Q&A decisions:**

- Primary experience? → **Visual explorer first** (chord diagram is the
  homepage).
- Grouping? → **Granularity slider** over 4 curated levels
  (157 colors → ~20 fine → ~10 broad → ~5 super).
- Visual style? → **Vintage print homage** (later refined, see below).
- V1 features? → **All four:** combination browser, color detail,
  copy & export, random inspiration.
- Tech stack? → explored options ("i don't know anything about the
  javascript world, but i do feel like we should use something that isn't
  pure vanilla"), then chose **Vite + React + TypeScript**.

**Mid-session prompt:** track the owner's prompts and choices so the site
could be re-created from them → this file exists; update rule in CLAUDE.md.

**Prompt:** keep PROMPTS updated via CLAUDE.md; create TODO.md and
TODO-completed.md; when done, move items over with the commit hash.

**Prompt:** setup/installation instructions must be in README; "we should
amke sure the README CLAUDE TODO Makefile information and other
documenation files are ALWAYS up to date and in sync. having wrong
documentation is WORSE than no documentation."

**Prompt:** brainstorm what each view may be used for; document usage ideas
in an About page or on the page itself. Examples given: outfit
coordination; "have somethign i want to wear and build a color wardrobe
around it"; website/slide theme colors. → user-stories section in spec;
header search added; About panel + contextual hints.

**Prompt:** stretch goal — iOS/Android app someday, "even take a picture
and look at related color combinations"; and add a data processing layer
into a standard format because "there may be a chance i have to change the
incoming JSON data or add new data becuase of data licencing issues."
→ pure core kernel + schema-versioned processed data.

**Prompt (after an interruption):** re-review spec for maintainability by
Claude and expandability; "so we're not purpously buildling in tech debt at
this early stage" → Architecture & maintainability section (core purity,
dependency budget, YAGNI list, roadmap-proofing table).

**Aesthetic mockup rounds (browser companion):**

1. Three directions → clicked **A — Washi & Ink (japandi/wabi-sabi)**;
   owner: "i do like an elegant and calm japandi / wabi-sabi feel".
2. "to make it a bit more personal, can we do more mock ups in the style
   of A? ... incorporate some of my own personal color branding elements,
   which is mosly the NYC orange and blue" (from the owner's site
   _brand.yml) → three brand-intensity variants; owner: "i do like the
   more subtle orange/blue".
3. Serif vs Atkinson Hyperlegible debate → chose **T3 hybrid**: "i like
   option 3 / T3 hybrid option that is a nice combination of letting both
   our styles speak to respective parts".

**Spec:** `docs/superpowers/specs/2026-07-19-color-combinations-explorer-design.md`
**Plan:** `docs/superpowers/plans/2026-07-19-color-combinations-v1.md`

## 2026-07-19 — Session 2: Execution

**Owner prompt (kickoff):**

> subagent driven! go go go!

**Owner prompt (mid-run, after a laptop sleep interrupted the session):**

> are you able to restart. sorry laptop fell asleep

**What happened:** the 18-task plan (`docs/superpowers/plans/2026-07-19-color-combinations-v1.md`)
was executed subagent-driven — a fresh subagent per task, each with its own
task-scoped code review before moving on (see `.superpowers/sdd/task-*-report.md`
and the paired `review-*.diff` files for the full trail). All 16 branch
tasks (project scaffold through responsive/a11y polish) landed on
`v1-build`, then a final whole-branch review ran against the complete diff
and passed (58/58 tests, clean typecheck, clean build) after one fix-up
commit (`d7cdfbe`). `v1-build` merged to `main` at `0ae7b32`. Task 17 (CI +
GitHub Pages) then ran directly on `main` (`575dcd5`), GitHub Pages was
enabled, and the site went live at
https://chendaniely.github.io/color-combinations/ (verified HTTP 200,
deploy run 29718883122). Task 18 (this one) closed out the loop: docs
true-up, TODO ledger reconciliation, and the `v1.0.0` tag.

## 2026-07-20 — Session 3: Post-v1 performance & browse polish

**Owner prompt:**

> great v1. we need to look into performance now.
>
> the wheel flickers a lot when hovering over. sometimes even flickering
> completely off where no wheel is seen. let's fix the weel hover
> performance before i'm able to use it in a way for next iteration.
>
> for the browse page. it would be good to have a header for the 2, 3, and
> 4+ colors so a 3 color palet isn't on the same line as the 2, for example.
> and easier to flip through and search

**What happened:**

- *Wheel hover flicker (root-caused, not patched).* The Colors level renders
  ~996 ribbon paths + ~157 arc groups. The original hover attached
  `mouseenter`/`mouseleave` to every one of those ~1150 elements, and each
  fire ran a full-scene `classed()` sweep over all ribbons and arcs with a
  200ms opacity transition — so every time the cursor crossed an element
  boundary (constantly, over hundreds of tiny paths) every transition
  restarted, producing the flicker. Worse, ribbon hover dimmed the *entire*
  wheel to 0.08 opacity; since the disc interior is wall-to-wall ribbons, the
  wheel visually vanished whenever the cursor was inside it (the "flickering
  completely off" symptom). `mix-blend-mode: multiply` on all 996 ribbons
  added compositing cost on top. Fix (`db37b1b`): replaced per-element
  listeners with **three delegated listeners** on the wheel `<g>`; hover
  state is **keyed** so moving between sub-elements of the same arc is a
  no-op and element-to-element moves swap state with no clear-all flash;
  dimming is now **one container class + a small `.hot` set** (writes scale
  with the hovered neighborhood, not the whole scene); ribbon hover only
  brightens the ribbon itself (the spec only asked for dimming on *arc*
  hover); blend mode is enabled only at group levels (≤40 nodes); labels get
  `pointer-events: none`; hover transition shortened to a 120ms token.
- *Browse size sections.* Plates are now grouped under **2 colors / 3 colors
  / 4+ colors** headers (letterspaced small-caps with a hairline rule and a
  per-section count), each in its own grid, so a 3-color palette never shares
  a row with a 2-color one and the page is easier to flip through.

**Follow-up prompt:**

> better. but now when i over over one of the lines inside the circle, it
> doesn't really stand out. before at least the other colors faded out a
> bit. i liked that behaviour, you can see the color connections

**What happened:** the first hover fix over-corrected — to kill the flicker I
had dropped ribbon-hover dimming entirely, but the flicker's real cause was
the event thrashing, not the dimming. With keyed delegated events now in
place (moving between ribbons swaps hot state directly, never clearing then
re-dimming), the "connections stand out" behavior is safe to restore. Ribbon
hover once again dims the rest of the wheel and keeps the hovered ribbon
**plus the two arcs it connects** bright, so you can read the color
connection. Restored without the flicker returning.

**Follow-up prompt (later, after the Match feature shipped):**

> the text of the colors on hoverover is not straight naymore it's slanted

**What happened:** the earlier snap-to-nearest fix moved the wheel's -4°
wabi-sabi tilt from a CSS transform on the `<svg>` onto the SVG group (so
`d3.pointer` angle math stays exact). That group rotation also tilted the
center label that shows the hovered color's name. Fix: counter-rotate the
center label by +4° (`rotate(${-TILT_DEG})`) so the hover text reads upright
while the colorful wheel keeps its off-axis tilt.

**Follow-up prompt:**

> let's do another thinking pass about a solution for the color wheel to
> make it smoother. in the colors only verion (not shades, families, groups)
> it still gets twitchy when i am hovering over.
>
> i think this is because sometimes as you are hovering over the inner lines
> you rmouse doesn't actually land on anyplace, so it flashes back into the
> full wheel view. let's have the mouse always snap to the nearest object
> (line inside or box outside) it hinkt his will help. what do you think? or
> do you think we need to use a different library?

**What happened:** the owner's diagnosis was exactly right. An SVG `<g>` has
no fill of its own, so at the Colors level (~1000 thin ribbons with gaps
between them + a hollow center) a cursor in a gap is "over nothing" — the
group's `pointerleave` fired and the wheel flashed back to the full view,
then the next ribbon re-dimmed it. No library change was warranted (any
renderer has the same gap problem, and d3 already bundles `d3-delaunay` for
nearest-neighbor lookup). Fix (`chordRender.ts` rewrite): a transparent
backing disc (`.wheel-hit`, radius `OUTER+30`) gives the whole wheel a hit
surface so `pointerleave` only fires at the true edge; hover now resolves by
**geometry from the cursor position** rather than which path it's on —
outside the inner radius it snaps to the arc at that angle, inside it snaps
to the nearest ribbon via a Delaunay index of points sampled along each
ribbon's centerline (a quadratic Bézier through the origin, matching
d3.ribbon). Resolution is keyed and rAF-throttled, so the highlight only
changes when the nearest object changes — it glides instead of strobing, and
there are no dead gaps to flash on. Clicks snap the same way (a click in a
gap selects the nearest line/box). The wabi-sabi tilt moved from a CSS
transform on the `<svg>` onto the SVG group so `d3.pointer`'s coordinate math
includes it and pointer→angle stays exact. Ribbons/arcs are now
`pointer-events: none` (the backing disc is the sole hit target).

## 2026-07-20 — Session 4: Color matching & outfit builder

**Owner prompt (kickoff):** improve the outfit-matching persona — when working
on a group (shades/families/groups) show the matching colors, and allow going
from general and slowly drilling down without jumping straight to a single
color ("we're skipping a bit too many steps").

**Decisions (see the spec's decisions log):** panel shows ranked partners AND
palettes; progressive narrowing within the panel (breadcrumb + sub-groups);
**keep the enriched panel AND add a new Match page**; the Match page combines a
pivot explorer with an outfit builder and supports **more than two colors**;
build from shades (exact-color pinning deferred); Match levels are Shades and
Families; a "Build a palette from this →" bridge seeds the page from a group.

> "i do like the ability where i can still click on a single shade… but i need
> a way to go from general and slowly drill down without drilling down to a
> single color."
>
> "i like a combination of pivot + outfit builder. the goal is to be able to
> pick colors and be able to pick more than 2 colors."
>
> "i do like the preview you also suggested earlier as well in the sidebar…
> the new page here is just a more detailed way to build a color set as well."

**Spec:** `docs/superpowers/specs/2026-07-20-color-matching-and-outfit-builder-design.md`
**Plan:** `docs/superpowers/plans/2026-07-20-color-matching-and-outfit-builder.md`

## 2026-07-20 — Session 5: Wheel legibility & orientation

**Owner prompt (opening — ribbon-hover clarification):** after asking why
hovering a ribbon highlights only two colors when the underlying combination
has more, the owner reconsidered:

> oh i guess the behavior i was looking for was what happens when you hover over
> the edge. i guess that makes sense

→ No change: hovering a color (outer rim) already fans out to every partner;
hovering a single link is inherently pairwise. Two optional enhancements were
offered; the owner took up the second (brighten partner arcs) next.

**Owner prompt (the work):**

> let's build on that last option 2. and improve the visualization on the main
> color wheel.
> here are some issues i have with it:
> - when i hover over an individual color (not on the edge), most of the time the
>   line between the 2 connecting colors are too thin. this is probalby when a
>   color only appears very few number of times. it seems the width of the
>   starting line width is proportional to how many times the color appears int
>   he dataset. that's fine, but it means rare color links wven when
>   "highlighted" are barely visable. so we need to improve that. i'm not sure if
>   a ticker line will fix this issue (let's think about this) becuase i don't
>   want a think line to hinder you trying to select the next adjacent color
>   either.
> - i think you can make the lines thicker when i hover over the edge of the
>   wheel, since there is no worry that i won't be able to hover over the
>   immediate adjacent one.
> - what do you think about making sure the colors for black are centered around
>   the 12 o'clock positoin? do you think that will help with visualization
>   consistency between the group sliders?

**Owner prompt (standards):**

> i just picked black because it throught it made sense. is there a more
> understood standard of how color wheels are placed? i rather go with industry
> and artistic standards than something i'm thinking of. you should defetnly
> always push back when i'm trying to do somethign against a standard or common
> practice

→ Pushed back: black-at-top is not a standard. The recognized screen convention
is **red at 12 o'clock, spectrum clockwise** (CSS `conic-gradient` default, most
hue rings). Chose that.

**Owner prompt:**

> how does the current positioning compare to the suggested ones?

→ Built a data-driven before/after prototype (real colors + real arc sizes) of
all four levels. Finding: the three group levels are already mutually
consistent; the Colors level is the outlier (pure-hue, so browns sit in the
orange sector and jump when you zoom).

**Owner decision:**

> let's go with your recommendation. let's take a note about the before/after and
> maybe prototype the layouts when you are planning

→ Adopted: **family order at every level** (Colors re-sorted so browns cluster)
+ **red at 12 o'clock**. Prototype published as an artifact:
https://claude.ai/code/artifact/06e012f8-559e-4663-bdbd-a62f048822f6

**Owner prompt (brand, mid-turn):**

> btw it should be NYC-orange-blue accent, not just orange. if possible

→ Prototype re-themed to use both brand colors (orange = 12 o'clock marker, blue
= the "proposed" column).

**Owner prompt (rotation fix):**

> the circle rotations look good. all exepct the first one, Groups — 4
> super-families, have red in the 12 o'clock position, it seems like it just need
> to rotate clockwise a bit for the red. i'm not questioning the ordering of the
> colors, just the rotation. currently is on a shade of yellow

→ Fixed the Groups (super) anchor: instead of centering the whole Warm arc
(whose size-weighted center lands on yellow), place the **reddest member's slice
within Warm** at top.

**Owner prompt:**

> ok this looks good for now, we can always go back to the rotation, color order,
> and oritentation at a later time

**Owner prompt (execute):**

> go implement in subagent-driven dev

**What happened:** executed subagent-driven in 3 tasks (each task-reviewed; final
whole-branch review passed — 86/86 tests, clean typecheck):

- Task 1 (`972e10b`, `c29643d`): Colors level re-sorted to family order (browns
  cluster, neutrals stay last); new pure `redAnchorAngle` (Red-block center for
  Colors/Shades/Families, reddest-in-Warm for Groups) with fixture + real-dataset
  tests.
- Task 2 (`4337eae`): the wheel rotates so red sits at 12 o'clock at every level;
  the center hover-label is counter-rotated to stay upright.
- Task 3 (`76ddf7f`): highlighted links get a stroke-width floor (bolder on
  color-hover than single-link hover) so rare-partner links stay visible without
  changing the resting layout; partner arcs brighten on color-hover.

**Spec:** `docs/superpowers/specs/2026-07-20-wheel-legibility-and-orientation.md`
**Plan:** `docs/superpowers/plans/2026-07-20-wheel-legibility-and-orientation.md`

**Owner prompts (post-review UI tweaks, while previewing the branch):**

> for the top nav. let's have wheel, match, browse, and then about. so let's
> swap the brose and match nav locations

→ Nav reordered to **Wheel · Match · Browse · About** (`5b209f4`).

> i'd like to add it so the site title on the top left of the menu all of those
> take you to the front page, which is the wheel

→ The "Iro" wordmark is now a clickable (accessible) button that returns to the
wheel and dismisses any open About panel / detail selection — a proper "home."

**Owner prompt (ship it):**

> this looks good. let's publish/push this up to github

→ Fast-forward merged to `main` and pushed; the CI "Test, build, deploy" workflow
redeploys https://chendaniely.github.io/color-combinations/.

## 2026-07-21 — Session 6: camera color capture

**Owner prompt (stretch goal, from Session 1):** "even take a picture and
look at related color combinations" — picked up as the next feature.

**Owner prompts (verbatim, this session — typos preserved):**

> now let's explore the mobile user story who is also using it for fashion.
>
> let's give the ability to search for a color based on what the phone / webcam camera sees. i want to think though a few parts of this:
>
> - being able to use the camera part of the find a color
>     - followup: what does a result look like?
>     - should we return a list of "similar" colors and also the shade/family
>
> i'd like to be able to have a camera look at an article of clothing (or object), find the color of the object, and then suggest the other matching color patterns. The flow is similar to how colors might be picked on the match tab, but we're changing the UI a bit.
>
> also. sometimes i may just want to point a camera at an object and then see color combinations as if i filtered it in the browse tab.
>
> let's think through the UI/UX for this deeply so it makes sense and doesn't add too much clutter to the interface.
>
> for some simplicity, we can rename the grey text of "find a color ... (indogo, olive)" to just "find a color..." or "search" or "search for a color". let's think and explore through all these UI concepts

> yes the data privacy and no frames being saved anywhere is really important. let's check for this and also we should have a footer or some kind of note about this so users are not spooked

> yes those decisions look good. yes also make sure we can potentially revisit how the color distance metric is calculated, just in case we want to change it or make adjustments on it later in the future

> i feel like we can add both of those dependencies. we do want the unit tests working, and i'm okay with not hand rolling a color-science lib.

> yes kick off the camera implmentation now

> ok go merge into main and push this is essentially another releaser version we're doing

> for the photo page. i think i need an instruction that tells the user that it is a 2 step process. take a photo then you can click around to pick a location / color. it' snot immediately obvious why the app seems like its frozen after you take a photo. usually people just expect it to select what was in the center, but i wanted that flexibility in the app so it's not obvious. let's just add the 2 steps for the user as text, and we can think about a better UX later

→ Also proposed then dropped this session: an About-panel footnote linking the
GitHub source — owner: "you already have the site by daniel, vibed by claude,
then nevermind that's enough." The existing "Site by Daniel, vibe-coded with
Claude" attribution stands. A "final documentation pass" + "tidy up branches"
were also requested and reconciled into these logs.

**Design decisions (see the spec's decisions log):**

- **Freeze-then-tap capture**, not a live continuous eyedropper: tap the
  shutter to freeze a frame, then tap the exact spot on the garment (re-tap
  to move the point; Retake returns to live). Chosen for accuracy — a moving
  live sample is noisier and harder to aim.
- **Result screen** is a hero (closest book color, name/code, plain-language
  closeness — "very close" / "close" / "roughly") over a scrollable near-match
  list (tap to promote to hero), plus a **Color / Shade / Family** selector
  with **Shade preselected** and two actions, Match and Browse, re-labelled
  to the chosen level.
- **Match gains a Colors level; Browse gains a shade filter** (dismissible
  chip) — the full grid the camera needed already: Match was Shade/Family
  only, Browse had no shade filter.
- **Perceptual matching via OKLab**, not naive RGB distance, using the
  **culori** library, isolated behind one seam (`src/color/colorDistance.ts`)
  so the metric (e.g. ΔE2000) is a one-file swap later. Lives in a new
  `src/color/` layer, not `src/core/` — culori can't be imported into the
  pure kernel without weakening `core-purity.test.ts`.
- **Privacy is a hard requirement, mechanically enforced**: no upload, no
  persistence, camera released (`track.stop()`) on close/unmount. Enforced by
  a source-scanning test, `tests/camera-privacy.test.ts` (modeled on
  `core-purity.test.ts`), that fails the build if `src/components/camera/*`
  contains `fetch`, storage APIs, `toDataURL`/`toBlob`, `createObjectURL`, or
  a download link.
- **Three new dependencies**, each justified in `CLAUDE.md` in the same
  commit as the plan: `culori` (runtime, OKLab distance); `jsdom`,
  `@testing-library/react`, `@testing-library/dom` (dev, real DOM
  interaction tests for the camera UI — opted into per-file, global test env
  stays `node`).
- Needs a secure (HTTPS/localhost) context + camera permission; where
  unavailable the camera icon in search simply doesn't render (feature
  detection, no dead button).

**What happened:** designed and planned across three docs commits
(`67d41c8` spec, `9b040e5` distance-seam note, `9a4e643` implementation plan
+ dependency additions), then executed **subagent-driven in 13 tasks**
(`f3280e3..9900ffa`), each task-reviewed. Full commit list:
`git log --oneline 87ffea2..HEAD`.

**Spec:** `docs/superpowers/specs/2026-07-20-camera-color-capture-design.md`
**Plan:** `docs/superpowers/plans/2026-07-20-camera-color-capture.md`

## 2026-07-21 — Session 7: accessibility goggles

**Owner prompt (opening, verbatim — typos preserved):**

> i'd like to have a dropdown on the top that let's you pick the underlying
> dataset. right now we are using the original dataset. let's create a
> separate dataset that is takes our original combinations and see if they
> pass a WCAG check for internet accessibilty. this way we can explore the
> original data. but then also internet passable data. this toggle will then
> we used in the future if we have more color datasets and can be used to
> explore between them. if not WCAG, let's look at other internet
> accessibilty checks that we can program and then create datasets for
> those. but let's think through this before just going into implementation

→ explored WCAG interpretations with real survivor counts against the
dataset.

**Owner prompt (verbatim):**

> are there any other accessiblity checks that we can look into? things like
> colorblind friendly and print friendly and black-and-white friendly?

→ added a color-vision-deficiency (CVD) lens; established B&W/print-safe as
an all-pairs ≥3:1 grayscale-contrast check; ruled out true CMYK soft-proofing
as not honestly programmable (it would need an ICC printer profile the site
doesn't have).

**AskUserQuestion — "How should a multi-color combination pass the WCAG
check?" — owner's answer (verbatim):**

> Ship both as 2 datasets

**AskUserQuestion — "Which derived datasets should v1 ship?" — owner's
answer (verbatim; this is the pivot that reframed the whole feature):**

> Web text-ready, Print & B&W safe, Color-blind safe, instead of dropdown i
> think we can make this a multi-select dropdown / selectize object instead.
> it's liek selecting the 2, 3, 4 color combo bits not actually changing the
> underlying dataset. so these accessibilty goggles only filter on the
> current dataset, they're not really new datasets. we should make sure
> these options appear in the match and browse pages as well, not just the
> wheel.

**Owner prompt (design approval):**

> yes make it so

**Owner prompt (spec approval):**

> yeah look good

**Owner prompt (execution approach):**

> subagents

**Key decisions reached:**

- Reframed from "swap the underlying dataset" to composable "accessibility
  goggles" that FILTER the current dataset (like the existing 2/3/4 size
  chips) — NOT separate datasets, NOT a dataset swap. The original
  dataset-registry/selector idea was retired for this feature (logged in
  `TODO.md` as future work).
- Three lenses ship in v1: **Web text-ready** (max pair WCAG contrast ≥
  4.5:1), **Print & B&W safe** (min pair ≥ 3:1 in grayscale — photocopy/B&W
  distinguishable), **Color-blind safe** (OKLab distance under protan+deutan
  simulation ≥ `CVD_THRESHOLD` 0.10, tunable).
- Composition is AND (stacking), not OR — the data showed OR barely filters
  (all-three OR ≈ 80% of combos = 272), while AND meaningfully narrows
  (all-three AND = 36).
- Goggles apply across the Wheel, Browse, AND Match — not just the wheel.
- "Print-friendly" is honestly scoped to the B&W/grayscale check; true CMYK
  soft-proofing is NOT claimed (would need an ICC printer profile the site
  doesn't have).
- culori stays confined to `src/color/` (new `src/color/accessibility.ts`
  seam, alongside `colorDistance.ts`); zero new dependencies.

**What happened:** designed and planned across two docs commits (`8f4d85a`
spec, `a34e167` implementation plan), then executed subagent-driven in 5
tasks (`1c4272a..ff0af04`), each task-reviewed:

- Task 1 (`1c4272a`): core `AccessLensId` type + `state.access` +
  `toggleAccess` reducer action.
- Task 2 (`5ba3fda`): `src/color/accessibility.ts` (lenses, profile,
  `allowedComboIds`) + `culori.d.ts` addition + `CLAUDE.md` note.
- Task 3 (`c58624a`..`46b681a`): optional `allowed?` filter seam threaded
  through `src/core/chord.ts` and `src/core/matching.ts`.
- Task 4 (`3fd2fe5`): `src/data.ts` `accessProfile`/`allowedFor` glue + the
  `AccessibilityGoggles` control.
- Task 5 (`ff0af04`): goggles wired across the wheel, browse, and match
  views + CSS + README.

**Spec:** `docs/superpowers/specs/2026-07-21-accessibility-goggles-design.md`
**Plan:** `docs/superpowers/plans/2026-07-21-accessibility-goggles.md`

## 2026-07-21 — Session 8: v1.2.0 release + accessibility-control UX

**Owner prompt (release):**

> oh push up the changes and deploy it officially

Bumped `package.json` to **1.2.0** (minor — new feature), committed as a
`chore(release)`, tagged **v1.2.0** (annotated), and pushed `main` + tag. The
`deploy.yml` workflow (test → build → deploy) ran green and published to
GitHub Pages.

**Owner prompt (wheel shrank):**

> the accessibility button and everything made the actual chord diagram too small! i really liked it when the wheel was bigger on the font page. it made it seem more prominent that this is a color explorer.

Regression from the goggles work: the chord `<svg>` had been wrapped in a new
`.wheel-wrap` div (added to position the "no matches" note), but the wrapper
didn't carry the `flex: 1; min-height: 0` the SVG relied on as a direct flex
child of `.wheel-view`, so the wheel collapsed to a small content-sized box.
Fix: moved the space-filling role onto `.wheel-wrap`.

**Owner prompt (close on outside click):**

> right now the accessibilty drop down only closes when the user re-clicks the button. i also want the dropdown to disapper when the user clicks anywhere outside of the button

Added a document-level `pointerdown` listener in `AccessibilityGoggles` that
closes the `<details>` when a press lands outside it (presses on the lens
options stay inside, so several lenses can be toggled without the menu
closing).

**Owner prompt (open direction / sidebar idea):**

> is it also a possible that when the accessibility button is clicked, the dropdown of selections pop upward? OR we can have another sidebar on the left that opens that explains the accessiblity options and all the toggles can happen there

**Owner prompt (sync selection across pages):**

> let's also sync up all the accessibilty options that are selected on each of the pages. if i'm looking at color blind, it should be selected across all the pages, and stuff

**Owner prompt (consistent location + Match overflow):**

> let's also think about the accessibilty button location. it's in a difference location across all 3 pages. that's a little jarring. it does kind of make sense where it is individually, but as a whole it seems all over the place. in particular in the Match page, when the accessibilty button is clicked, the options flow over the right of the page, and you get a horrizontal scroll bar. let's not let that happen

**Decisions reached (asked as two multiple-choice questions):**

- Open direction — chose **drop-up** first, then **superseded** by the
  placement decision below.
- Placement — chose **"Same spot on every page."** Moved the goggles out of
  the three views (`WheelControls`, `BrowseView`, `MatchPage`) and into the
  shared `Header`, so it renders **once** in the top-right nav, sits in the
  identical spot on every page, and is structurally a single global control.
  This also settled the "sync" ask for free — there is only one instance now,
  so per-page state can't drift. Because it's at the top, the menu opens
  **downward** (drop-up no longer needed), and the `.a11y-menu` was made
  **right-aligned** (`right: 0`) so it can never run past the right viewport
  edge — killing the Match horizontal-scrollbar bug.

**What happened:** bugfix/UX pass, all under `make test` (142 passing, +2 new
outside-click jsdom tests) and `make build` green. Docs updated in-commit
(`README.md` accessibility section, this log). Follow-up patch release.

### Session 8 continued — live preview iteration (→ v1.2.1)

Ran `make dev` and refined the accessibility control + wordmark against the
live site.

**Owner prompt:**

> let's preview

**Owner prompts (control placement + selected color):**

> i don't like the accessibilty in the top right menu. i'd like to have it float in the top right corner below the menu, if possible

> the accessibilty dropdown when an item is selected, the title color does not invert properly and is completely covered by the background selected color. first. i think the selected color is a bit too dark. for the selected color. let's use the NYC blue in this example (this is where my personal flair comes in)

Moved the goggles out of the header `<nav>` and floated it in the top-right
corner of the content area (`position: absolute` in `<main>`), reserving room
on the Match/Browse top rows so nothing slides under it. Moving it out of the
nav also fixed the "title covered" bug: the `.nav button` rules had been
bleeding into the `.a11y-option` buttons and squashing their padding. Changed
the selected-lens fill from the dark `--ink` to the owner's **NYC blue**
(`--link`), with the label/description inverted to paper.

**Owner prompt (shorten the wordmark):**

> we might need to cut down the length of the title. "A dictonary of color combinations" has too many characters. let's explore some other options that's faithful to the original source text

Offered four faithful options (incl. the original Japanese title 配色事典 /
"Haishoku Jiten"); owner chose **"Color Combinations."** The full official
title stays in the About panel and the PNG/JSON export credits for attribution.

**Owner prompt (a Python pun), then reversal:**

> what do you think of using `{color combinataions}` it's a bit of a pun of python, but i'm not sure tha'll make sense since we aren't coding this in python even though i'm a python dev

> nvm i don't like it. you're right i want it more wabi-sabi less playful

Tried `{color combinations}` set in the mono face (the braces echoing the
source being a "Dictionary" = Python's dict literal), then reverted to the
plain uppercase "Color Combinations" — owner wanted it quieter/more wabi-sabi.

**Owner prompt (ship):**

> not his is good let's push this verison

Released as **v1.2.1**.

## 2026-07-22 — Session 9: hex/photo color explorer

**Owner prompt (feature request):**

> a new feature i'd like: is to provide a hex for a color and then explore similar colors. this should be similar to how the camer/picture color matchign works. but i'd like the ability for the user to provide a photo or a direct hex color code.
>
> user story, i wanted to pass in NYC orange or NYC blue, and wanted to see what colors are similar enough to the orange and blues when i'm picking pallets

**Owner prompt (upload should eyedrop, mid-brainstorm):**

> the image upload shold behave like the photo being taken where the use should also be able to eye drop a region of the photo

**Owner prompt (asked to see a prototype of the two result layouts):**

> can i see a prototype of the 2 versions before final decisoin?

**Owner prompt (chose the explore grid + unification):**

> let's just go with the explore grid and go from there. we can iterate on that instead i rather have a single unified interface. makes things simplier overall

**Owner prompt (design pass-1 approval):**

> sure this seems good. let's go

**Owner prompt (design pass-2 approval, defers the color wheel):**

> the color wheel / rgb sliders is nice but we can do that next time. let's go with this

**Owner prompt (approve spec + execute):**

> go go go! do it in subagent mode

**Decisions reached:**

- Three color SOURCES converge on ONE result: existing live **camera**, new
  **uploaded photo** (tap/eyedrop a region, like the frozen camera frame), and a
  pasted **hex** — all launched from one always-visible "Sample a color" picker
  (chosen over hex-in-the-search-bar).
- Result is an **explore-first grid** of the **12 nearest** book colors with
  closeness labels (chosen over reusing the camera's single-hero screen), decided
  after seeing a browser mockup of both against real NYC-blue neighbors.
- **Unified interface:** the camera adopts the grid too — one result component
  (`ColorMatches`, refactor of `CaptureResult`), not two. `CameraSearch` became
  `ColorSampler`.
- Pure `parseHex` added to the core kernel; the new browser components live in a
  new `src/components/sample/` dir (so the upload path's `URL.createObjectURL`
  doesn't trip `tests/camera-privacy.test.ts`, which scans `camera/`); a sibling
  `tests/sample-privacy.test.ts` guards the new dir against network/storage.
- Zero new dependencies (reuses `nearestColors`, `averagePatch`, `closenessLabel`,
  and the existing Match/Browse dispatch wiring).
- **Deferred to next time:** a color-wheel / RGB-slider source (logged in TODO).

## Session 10 — mobile wheel highlighting (touch scrub)

**Owner prompt (verbatim):**

> i want to improve the front page wheel mobile experience. when i finger over the figure it doesn't really do a good job highlighting the pairs.

**Root cause found:** the chord wheel's highlight was driven only by
`pointermove` + `click`, and `.chord-wheel` had no `touch-action` rule — so on a
touchscreen the browser claimed a finger-drag as a page scroll and starved the
pointer stream, and the live dim/bold/center-label highlight barely fired. Same
class of bug the camera canvas had already solved with `touch-action: none`.

**Decisions reached:**

- Add `touch-action: none` to `.chord-wheel` (mirrors `.cam-canvas`) so a finger
  dragged over the wheel scrubs the highlight live instead of scrolling the page.
- Make touch a first-class "hover": **press or drag scrubs** the nearest-object
  preview (center-label name + dim others + bold the pair); a **tap opens**; a
  **drag only explores** (no accidental navigation to wherever the finger lifts).
  Desktop hover+click is unchanged. Implemented in `src/viz/chordRender.ts` via
  `pointerdown`/`pointerup` tap-vs-drag (10px slop) with the synthetic click
  gated to mouse only; `pointercancel` handled alongside `pointerleave`.
- No new dependencies; D3/DOM interaction stays covered by the owner browser
  checklist (added a mobile touch-scrub line to `TODO.md`).

## 2026-07-22 — Session 11: CHANGELOG for the classroom

**Owner prompt (verbatim):**

> also i want you to keep a CHANGELOG file in here. we've alrady done a lot of
> releases already so we can populate that. but i also want you go through the
> history (commit history / chat history) and try to summarize all the major
> changes i've been asking for.
>
> the goal is to track how i'm prompting and using it to show students that the
> output of these things are still heavily guided by me. and not somethign that
> is vibe coded from the beginning. I want to document that improvements are
> incremental and guided by me.
>
> the CHANGELOG entries before we started versioning tags could be what we have
> in the superpowers plans and then use the between superpower plan commits to
> figure out what I was trying to do or prompted. again, i want to try to show
> how improvements were made and what i was trying to fix

**What happened:** created `CHANGELOG.md` covering all seven tagged releases
(v1.0.0 → v1.3.1) plus the three batches of work that shipped continuously to
the live site between v1.0.0 and v1.1.0 without their own tags (hover-perf +
browse sections, the Match/outfit builder, and wheel legibility/orientation) —
reconstructed from the superpowers specs/plans and the commits between them.

**Decisions / framing:**

- Every entry pairs **what changed** with **the owner prompt that drove it**,
  quoted verbatim (typos preserved) from `PROMPTS.md` — so the file doubles as a
  teaching record that an AI-built site is still steered release-by-release by a
  human. Explicitly called out the two-way guidance (owner asking Claude to push
  back against non-standard choices) and course-reversals (the `{color
  combinations}` pun, the accessibility-control placement iteration).
- Wired into the docs contract: `README.md` project-structure list gains a
  `CHANGELOG.md` bullet; `CLAUDE.md` now requires a paired entry on every release
  and says to keep the human-guided framing (not reduce it to a bare list).
- No version bump — this is documentation, not a shippable feature.
