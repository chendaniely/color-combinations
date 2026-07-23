# Changelog

Every notable change to **Iro 色 — A Dictionary of Color Combinations**,
newest first.

## Why this file reads the way it does

The code in this project is written by an AI (Claude); the owner doesn't read
JavaScript, HTML, or CSS. It would be easy to call that "vibe coding" and
assume the machine just ran off on its own. It didn't. Every release below
started with a specific request from the owner — a feature to add, a bug that
annoyed them, a layout that felt wrong — and every design call was a human
decision: weighing options, previewing mockups, and sometimes reversing course.

So each entry pairs **what changed** with **the prompt that drove it** (quoted
verbatim — typos preserved — from [`PROMPTS.md`](PROMPTS.md), the append-only
log of the owner's words). Read top-to-bottom it's a release history; read the
quotes alone and it's a record of how one person steered an AI build, one
incremental, deliberate decision at a time. The guidance runs both ways, too —
the owner has explicitly asked Claude to *push back* when a request goes against
a standard (see the wheel-orientation work on 2026-07-20).

This project follows [Semantic Versioning]. The site redeploys on every push to
`main`, so a few improvements reached the live site *between* tagged versions;
those are grouped under dated headings in the right chronological place.

[Semantic Versioning]: https://semver.org/

---

## [1.3.1] — 2026-07-22 — Mobile wheel touch-scrub highlighting

> **Owner asked for:** "i want to improve the front page wheel mobile
> experience. when i finger over the figure it doesn't really do a good job
> highlighting the pairs."

- The chord wheel now responds to touch the way it responds to a mouse. **Press
  or drag a finger** over the wheel to scrub the highlight live — the nearest
  color/pair brightens, everything else dims, and the name shows in the center.
- **Tap to open** a color/pair; a **drag only explores** (no accidental
  navigation to wherever your finger lifts).
- Root cause of the old jank: the wheel had no `touch-action` rule, so the
  browser claimed finger-drags as page scrolls and starved the highlight of
  pointer events. Fixed with `touch-action: none` (the same fix the camera
  canvas already used) plus tap-vs-drag pointer handling.

_Commits `6956cbd`, `0726f35`._

## [1.3.0] — 2026-07-22 — Source-agnostic color sampler (hex · photo · camera)

> **Owner asked for:** "a new feature i'd like: is to provide a hex for a color
> and then explore similar colors… i'd like the ability for the user to provide
> a photo or a direct hex color code. user story, i wanted to pass in NYC orange
> or NYC blue, and wanted to see what colors are similar enough… when i'm
> picking pallets."
>
> On the photo path: "the image upload shold behave like the photo being taken
> where the use should also be able to eye drop a region of the photo."
>
> On the result design: "let's just go with the explore grid… i rather have a
> single unified interface. makes things simplier overall."

- One always-visible **"Sample a color"** button opens a picker with three ways
  to name a color, all landing on the same result: **Camera**, **Upload a
  photo** (tap/eyedrop a region), and **Paste a hex** (e.g. `#F26522`).
- The result is a unified **12-nearest-book-colors** explore grid with
  plain-language closeness labels → hand off to **Match** or **Browse**.
- The camera adopted the same grid — one result component, not two. Uploaded
  photos and camera frames never leave the device (guarded by a privacy test).
- Under the hood: a pure `parseHex` in the core kernel; zero new dependencies.

_Deferred by the owner ("the color wheel / rgb sliders is nice but we can do
that next time"): a color-wheel / RGB-slider source. Released `7dedf2b`._

## [1.2.1] — 2026-07-21 — Accessibility control UX + shorter wordmark

> **Owner asked for (placement, after trying several):** "i don't like the
> accessibilty in the top right menu. i'd like to have it float in the top right
> corner below the menu, if possible."
>
> **On the selected color:** "let's use the NYC blue in this example (this is
> where my personal flair comes in)."
>
> **On the title length:** "we might need to cut down the length of the title.
> 'A dictonary of color combinations' has too many characters." → chose
> **"Color Combinations"** (a Python-pun `{color combinations}` was tried and
> then pulled: "nvm i don't like it… i want it more wabi-sabi less playful").

- The accessibility goggles now sit in the **same spot on every page** —
  floating in the top-right of the content — instead of drifting between views.
  (The owner iterated here: drop-up menu → one shared control → floating corner.)
- The menu **closes when you click outside it**, and its selected lenses fill
  with the owner's **NYC blue** with properly inverted labels.
- **Restored the full-size chord wheel** — a regression from the goggles work
  had shrunk it. "i really liked it when the wheel was bigger… it made it seem
  more prominent that this is a color explorer."
- Shortened the wordmark to **"Color Combinations"** (the full title stays in
  the About panel and export credits).

_Commits `0bbdf69`, `8dcc38d`; released `cab89cd`._

## [1.2.0] — 2026-07-21 — Accessibility goggles

> **Owner started here:** "i'd like to have a dropdown on the top that let's you
> pick the underlying dataset… see if they pass a WCAG check for internet
> accessibilty."
>
> **…then reframed the whole feature (the key pivot):** "instead of dropdown i
> think we can make this a multi-select… these accessibilty goggles only filter
> on the current dataset, they're not really new datasets. we should make sure
> these options appear in the match and browse pages as well, not just the
> wheel."
>
> **Released with:** "oh push up the changes and deploy it officially."

- Added composable **accessibility "goggles"** — optional filters you can stack
  on the Wheel, Browse, and Match: **Web text-ready** (WCAG AA contrast),
  **Print & B&W safe** (grayscale-distinguishable), and **Color-blind safe**
  (distinct under red-green CVD simulation).
- Stacking is **AND** (turn several on → only combinations that pass *all*
  show), because the data showed OR barely narrowed anything.
- Honestly scoped: "print-friendly" means the B&W/grayscale check — true CMYK
  ink proofing isn't claimed. Color science stays isolated in `src/color/`; zero
  new dependencies.

_Built subagent-driven (`1c4272a..ff0af04`); released `5d2b5b2`._

## [1.1.1] — 2026-07-21 — Camera capture guidance + label legibility

> **Owner asked for:** "for the photo page. i think i need an instruction that
> tells the user that it is a 2 step process. take a photo then you can click
> around to pick a location / color. it' snot immediately obvious why the app
> seems like its frozen after you take a photo."

- Added explicit **two-step instructions** to the camera capture (take a photo,
  then tap the spot on it), since the freeze-then-tap flow wasn't self-evident.
- Drew a paper **halo behind the wheel's center hover-label** so a color's name
  stays readable over the busy ribbon crossings.

_Commits `c7e232c`, `129367b`; released `8ae02d1`._

## [1.1.0] — 2026-07-21 — Camera color capture

> **Owner asked for:** "let's give the ability to search for a color based on
> what the phone / webcam camera sees… have a camera look at an article of
> clothing (or object), find the color of the object, and then suggest the other
> matching color patterns… also. sometimes i may just want to point a camera at
> an object and then see color combinations as if i filtered it in the browse
> tab."
>
> **On privacy:** "yes the data privacy and no frames being saved anywhere is
> really important. let's check for this and also we should have a footer or some
> kind of note about this so users are not spooked."
>
> **Released with:** "ok go merge into main and push this is essentially another
> releaser version we're doing."

- Point your phone/webcam at something → **freeze a frame, tap the exact spot**
  → the site finds the nearest book colors and hands off to Match or Browse.
- **Privacy is mechanically enforced**: no upload, no storage, camera released on
  close — a build-failing source-scan test guards the camera code, and an
  on-page note reassures users.
- Matching uses **perceptual OKLab distance** (via the new `culori` dependency),
  isolated behind a one-file seam so the metric can be swapped later.
- To feed the camera, **Match gained a Colors level** and **Browse gained a
  shade filter** — the fuller grid the feature needed.

_Built subagent-driven; spec `67d41c8`, released `5536aa6`._

---

### 2026-07-20 — Wheel legibility & orientation _(shipped between v1.0.0 and v1.1.0, untagged)_

> **Owner asked for:** "improve the visualization on the main color wheel… when
> i hover over an individual color… the line between the 2 connecting colors are
> too thin… rare color links even when 'highlighted' are barely visable… i think
> you can make the lines thicker when i hover over the edge of the wheel… what do
> you think about making sure the colors for black are centered around the 12
> o'clock positoin?"
>
> **And, notably, asked for pushback:** "is there a more understood standard of
> how color wheels are placed? i rather go with industry and artistic standards
> than something i'm thinking of. you should defetnly always push back when i'm
> trying to do somethign against a standard or common practice."

- **Red now sits at 12 o'clock at every granularity** (the recognized screen
  convention), and the Colors level is re-sorted into family order so browns
  cluster instead of scattering — chosen over the owner's initial black-at-top
  idea after Claude pushed back with the standard and a before/after prototype.
- Highlighted links get a **stroke-width floor** so rare pairings stay visible
  when highlighted, without thickening the resting wheel; partner arcs brighten
  on hover.
- Top nav reordered to **Wheel · Match · Browse · About**, and the **"Iro"
  wordmark is now a clickable "home"** that returns to the wheel.

_Commits `972e10b..76ddf7f`, `5b209f4`, `87ffea2`._

### 2026-07-20 — Color matching & outfit builder _(shipped between v1.0.0 and v1.1.0, untagged)_

> **Owner asked for:** "i do like the ability where i can still click on a single
> shade… but i need a way to go from general and slowly drill down without
> drilling down to a single color… i like a combination of pivot + outfit
> builder. the goal is to be able to pick colors and be able to pick more than 2
> colors."

- New **Match page**: start from a color, shade, or family, see what the book
  pairs with it, and build a **3-, 4-, or more-color** outfit palette.
- The group detail panel gained a **breadcrumb, ranked partners, book palettes,
  a "narrow to a sub-group" control**, and a **"Build a palette from this →"**
  bridge into Match — so you can drill down gradually instead of jumping
  straight to one exact color.

_Commits `409dc5c..2f2dfa5`._

### 2026-07-20 — Wheel hover performance & Browse sections _(shipped after v1.0.0, untagged)_

> **Owner asked for:** "the wheel flickers a lot when hovering over. sometimes
> even flickering completely off where no wheel is seen. let's fix the weel hover
> performance… for the browse page. it would be good to have a header for the 2,
> 3, and 4+ colors so a 3 color palet isn't on the same line as the 2."
>
> **Follow-up (self-diagnosed the fix):** "let's have the mouse always snap to
> the nearest object (line inside or box outside)… i hinkt his will help. what do
> you think?"

- Killed the **hover flicker** (the wheel would sometimes vanish entirely): the
  old code attached listeners to ~1,150 tiny paths and restarted a full-scene
  fade on every crossing. Replaced with a few delegated, keyed listeners so the
  highlight glides instead of strobing.
- Implemented the owner's **snap-to-nearest-object** idea — a transparent hit
  disc plus geometry-based resolution (Delaunay index of ribbon centerlines) so
  a cursor in a gap never "falls through" and flashes the wheel back to full.
- **Browse now groups plates under 2 / 3 / 4+ color headers**, each its own grid
  with a count, so palettes of different sizes don't share a row.

_Commits `db37b1b`, `3cd01df`, `297ca7d`, `f3fa204`, `6f6b515`._

---

## [1.0.0] — 2026-07-19 — Initial release

> **The prompt that started everything:** "let's plan in interactive website. i
> want to visualize the 'A Dictionary of Color Combinations'… maybe first in a
> ciruclar chord diagram of the different color combinations. maybe as 2, 3, and
> 4 the way the book has them… i'll tell you right now i don't know anythign
> about javascript, html, and css, this will be a fully vibe coded project…
> finally i'd like to deploy this as a github pages site… group the colors
> together so all the different shades of pink, for exmaple, can be viewed as a
> single entity… picking colors for a website, presetnation… but also for picking
> out color combinations for what to wear."

The first version, designed across an interactive brainstorm (aesthetic mockup
rounds, a chosen tech stack, a written spec) and then built subagent-driven
through 18 test-driven tasks:

- **The color wheel** — a D3 chord diagram of all 348 combinations with **four
  granularity levels** (individual colors up to super-families), size filters
  (2/3/4-color), and hover highlighting.
- **Detail panels & combination plates** with **copy/export** to hex, CSS
  variables, JSON, and **PNG**.
- **Browse view** filtered by size, family, and contained color; **color
  search**; an **About panel** with usage recipes; a **"Surprise me"** animation.
- The **"Washi & Ink"** aesthetic (japandi/wabi-sabi with the owner's NYC
  orange/blue brand and a T3 hybrid of EB Garamond + Atkinson Hyperlegible),
  responsive layout, reduced-motion support, and a11y polish — all chosen
  through mockup rounds ("i do like an elegant and calm japandi / wabi-sabi
  feel"; "the more subtle orange/blue").
- **Continuous deploy** to GitHub Pages on every push to `main`.

_Built on branch, merged at `0ae7b32`; CI + docs true-up tagged `f1145e3` (v1.0.0)._
