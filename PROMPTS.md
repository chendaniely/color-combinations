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
