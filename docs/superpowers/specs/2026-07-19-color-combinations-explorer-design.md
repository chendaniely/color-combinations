# Design: Sanzo Wada Color Combinations Explorer

**Date:** 2026-07-19
**Status:** Approved pending user review of this document
**Deploy target:** GitHub Pages (fully static)

## Purpose

An interactive website that visualizes the 348 color combinations from Sanzo
Wada's *A Dictionary of Color Combinations* (1930s). Primary experience is a
beautiful, playful visual explorer (a chord-diagram "color wheel"); secondary
experience is a practical picker for choosing palettes for websites,
presentations, and outfits. A key feature is hierarchical color grouping so
users can work with "all the pinks" instead of exact shades — combinations
don't need to be exact matches to be useful.

The project is fully vibe-coded: the owner does not read JavaScript/HTML/CSS.
All documentation (README, Makefile, PROMPTS.md, CLAUDE.md, TODO files) must
be written for a non-JS reader and kept current by every session.

## Source data

`https://sanzo-wada.dmbk.io/assets/colors.json`, vendored into the repo
(never fetched at runtime — reliability and CORS). Facts about the data:

- 157 colors. Each has: `index`, `name`, `slug`, `hex`, `rgb_array`/`rgb`,
  `cmyk_array`/`cmyk`, `combinations` (list of combination IDs the color
  appears in), `use_count`.
- Combinations are implicit: combination *N* = the set of colors whose
  `combinations` array contains *N*. IDs run 1–348.
- Size distribution: 124 two-color, 112 three-color, 99 four-color,
  **plus quirks:** 10 one-color "combinations" and 3 five-color ones.
- One color, Vandar Poel's Blue, appears in zero combinations.

### Data quirks policy

- The 10 one-color combinations are **excluded** everywhere (data errors; the
  book has none).
- The 3 five-color combinations are **kept**, shown under the "4" size filter
  and labeled "4+".
- Vandar Poel's Blue still appears on the wheel and has a color detail view,
  honestly labeled "appears in no combinations."

## Site structure (single-page app)

### The Wheel (homepage)

Full-screen D3 chord diagram:

- Every color is an arc around the circle, **ordered by hue** so the ring
  reads as a color wheel. Ribbons connect colors that co-occur in at least
  one combination; ribbon weight = number of shared combinations.
- Overlaid controls: the **granularity slider** (see Grouping) and
  **combination-size filter chips (2 / 3 / 4)** which recompute the ribbons.
- Hovering an arc highlights its ribbons and dims the rest. Clicking an arc
  opens the color detail panel. Clicking a ribbon lists the actual
  combinations connecting those two colors/groups.

### Browse view

Card grid of the 338 displayable combinations (348 minus the 10 excluded
one-color quirks) rendered as "plates" like the book:
proportional color bars with color names in small caps beneath. Filters:
size (2/3/4), color family, "contains this color." Clicking a card opens the
combination detail panel.

### Detail panels

Slide-in side panels (bottom sheets on mobile), no page reloads:

- **Color panel:** large swatch; name; hex/RGB/CMYK each click-to-copy; its
  family at every grouping level; every combination it appears in.
- **Combination panel:** the plate rendered large; per-color click-to-copy;
  export buttons — copy as CSS custom properties, download JSON, download
  PNG image of the plate.

### Surprise me

Header button that deals a random combination (with a card-deal animation) —
the outfit-of-the-day use case.

## Grouping: the granularity slider

A hand-curated, hue-verified hierarchy stored as a data file in the repo.
Every color gets three ancestors:

1. **157 individual colors**
2. **~20 fine families** — e.g. Dusty Pinks, Hot Pinks, Olives
3. **~10 broad families** — Pink, Red, Orange, Yellow, Green, Blue, Purple,
   Brown, Neutral
4. **~5 super groups** — e.g. Warm, Cool, Earthy, Neutral

The slider snaps between the four levels; the chord diagram animates arcs
merging/splitting. Combinations aggregate with the colors, so at the broad
level the wheel shows e.g. "Pink + Blue appears in 14 book combinations."
Clicking an aggregated ribbon drills into the specific combinations. Group
arcs render as a mini-gradient of member colors so nothing is hidden.

The curated assignments are validated by automated tests (every color has an
ancestor at every level; assignments are sane vs. computed hue).

## Visual design

Vintage print homage to the 1930s book:

- Warm paper background, dark warm-gray "ink" text, elegant serif display
  face (self-hosted), generous whitespace.
- Combination cards styled like printed plates, names in small caps.
- Fun through motion, not decoration: silky chord transitions, ribbons that
  bloom on hover, deal-the-cards animation on Surprise Me.
- Responsive: wheel scales down; side panels become bottom sheets on phones.

## Tech stack

- **Vite + React + TypeScript**, with **D3** driving the chord layout/render.
  Chosen for maximum AI-maintainability (most common stack, strongest typing
  safety net for a project no human reads).
- **Vitest** for logic tests: data integrity (348 combos reconstructed,
  quirks policy applied), grouping completeness, aggregation math.
- **GitHub Actions**: on every push to `main`, run typecheck + tests + build,
  then deploy `dist/` to GitHub Pages. CI failure blocks deploy.
- **Makefile** targets: `make dev`, `make test`, `make build`,
  `make update-data` (re-download colors.json and regenerate derived data).

## Repo documentation contract

These files are first-class deliverables and every future session must keep
them current (enforced by instructions in CLAUDE.md):

- **README.md** — what the site is, how to run/deploy, written for a non-JS
  reader.
- **Makefile** — always matches reality.
- **PROMPTS.md** — chronological log of the owner's prompts and the choices
  they made in response to Claude's questions, detailed enough that the site
  could be re-created from it. Includes the initial prompt and all
  brainstorming decisions to date.
- **TODO.md** — ideas and items deliberately skipped for later, so ideas are
  never lost.
- **TODO-completed.md** — items moved here when done, each with the commit
  hash that completed it (best effort).
- **CLAUDE.md** — context for future Claude sessions: architecture map,
  conventions, and the explicit rule to keep all the above updated.

## Decisions log (brainstorming answers)

| Question | Decision |
|---|---|
| Primary experience | Visual explorer first — chord diagram is the homepage |
| Grouping | Granularity slider over 4 curated levels (157 / ~20 / ~10 / ~5) |
| Aesthetic | Vintage print homage |
| V1 features | Combination browser, color detail, copy & export, random inspiration |
| Tech stack | Vite + React + TypeScript (+ D3, Vitest) |
| Prompt tracking | PROMPTS.md, update rule recorded in CLAUDE.md |
| Idea tracking | TODO.md / TODO-completed.md with commit hashes |

## Out of scope for v1

- User accounts, saving favorites, sharing links to specific states
  (deep-linking may be a later TODO)
- Fetching live data at runtime
- Color-blindness simulation modes (candidate for TODO.md)
- Outfit/website mockup previews (candidate for TODO.md)
