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
