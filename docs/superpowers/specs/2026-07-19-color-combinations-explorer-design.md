# Design: Sanzo Wada Color Combinations Explorer

**Date:** 2026-07-19
**Status:** v1 shipped (2026-07-19)
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

### Data processing layer (internal format)

**The app never reads the source JSON directly.** A processing script
(run via `make update-data`) ingests raw source data and emits a stable,
documented internal format the site consumes:

- Raw source lives in `data/raw/` (vendored copy of `colors.json`).
- The script transforms it into `data/processed/`: explicit color records,
  explicit combination records (reconstructed from the per-color
  combination IDs), and the grouping hierarchy.
- **Why the indirection:** the incoming data may have to change — licensing
  issues could force replacing or supplementing the source. Only the ingest
  script knows the source format; swapping or adding sources touches that
  one script, not the app. The internal schema is the contract and is
  documented in the repo.
- The quirks policy below is applied at ingest time and recorded as flags
  in the processed data (nothing is silently deleted).

### Data quirks policy

- The 10 one-color combinations are **excluded** everywhere (data errors; the
  book has none).
- The 3 five-color combinations are **kept**, shown under the "4" size filter
  and labeled "4+".
- Vandar Poel's Blue still appears on the wheel and has a color detail view,
  honestly labeled "appears in no combinations."

## User stories

These stories drive the UI/UX; each view exists to serve specific ones.

1. **Outfit from scratch ("dress me").** Wants a fresh outfit palette.
   → Surprise Me, or Browse filtered to 2–3 color combos in preferred
   families. Plate proportions suggest dominant garment vs accent pieces.
2. **Build around an anchor item ("my navy shirt").** Owns a piece, wants
   partners for it. → Search or click their color, color detail lists every
   combination containing it; since real items never match exactly, bump the
   granularity slider a level to see what pairs with Blues in general, and
   note repeated partner families (a wardrobe signal).
3. **Website / slide theme.** Needs 2–4 colors plus the codes. → Browse →
   combination detail → copy CSS variables / hex codes; plate proportions
   map to background/primary/accent roles.
4. **Learn color theory.** → Set the wheel to broad families and read the
   ribbon weights: which families did Sanzo Wada combine most? The coarse
   wheel is a lesson, not just a picture.
5. **Match an exact outside color** (brand hex, paint chip) to the nearest
   of the 157. → Deferred to TODO.md (nearest-color search), not v1.
6. **Just play.** No goal; the wheel is a toy. Motivates the motion/polish
   investment.

Story 2 adds a v1 requirement: a **search box** (by color name) in the
header, since typing "navy" beats hunting the wheel.

### In-site guidance

- An **About panel** (opened from the header): the book's story, and short
  "how to use this" recipes matching the user stories above.
- **Contextual one-line hints** on each view where the user already is,
  e.g. the granularity slider gets "your shirt doesn't have to match
  exactly — zoom out to see what pairs with blues in general"; Browse gets
  a hint about plate proportions mapping to dominant/accent roles.

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

### Header search

Type-ahead search over the 157 color names (e.g. "navy") that opens the
matching color's detail panel. Serves the anchor-item story.

### About panel

Opened from the header: the story of the book, and "how to use this"
recipes matching the user stories.

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

**Chosen direction: "Washi & Ink" — japandi / wabi-sabi, personalized with
the owner's brand.** Decided over three mockup rounds (all preserved for
reference; open in a browser):

- `docs/superpowers/specs/2026-07-19-aesthetic-mockups.html` — round 1:
  Washi & Ink chosen over Vintage Print and Modern Gallery.
- `docs/superpowers/specs/2026-07-19-aesthetic-brand-mockups.html` —
  round 2: brand-integration intensity; subtle ("A1") level chosen.
- `docs/superpowers/specs/2026-07-19-typography-mockups.html` — round 3:
  typography; hybrid ("T3") chosen.

### Palette (from the owner's personal brand)

Neutrals and accents come from the owner's site brand file
(https://github.com/chendaniely/chendaniely.github.io/blob/main/_brand.yml),
whose warm-neutral philosophy ("sand/linen/taupe, never cool gray") is
already japandi:

- Ground: warm-white `#F8F6F2` with a soft gradient toward `#F0EBE2`.
- Ink: charcoal `#2F2A26`; muted text warm-gray `#7E7468`; faint text and
  disabled states stone `#B8AEA2`; hairlines sand `#E8DDD2`.
- **NYC flag orange `#F26522` — sparingly, as the owner's brand dictates:**
  the seal (hanko with 色), the active-nav underline, the granularity
  slider's active stop, hover states. Nowhere else.
- **NYC flag blue `#236192`:** links and informational accents, exactly as
  on the owner's site.
- Sanzo Wada's colors always keep their own values; the brand lives only in
  the chrome.

### Typography (hybrid — "both styles speak to their parts")

All fonts self-hosted (no external font CDN at runtime):

- **EB Garamond** (serif) speaks only where the book speaks: the wordmark
  and color/combination names, at display sizes.
- **Atkinson Hyperlegible** (the owner's brand face) for all UI chrome,
  labels, body and About text.
- **Atkinson Hyperlegible Mono** for color codes (hex/RGB/CMYK) — designed
  to be read, ideal for a copy-the-code tool.

### Composition & motion

- Airy letterspacing, small caps for labels; generous whitespace and calm,
  unhurried composition.
- Hairline sand rules instead of boxes/borders; elements allowed to sit
  slightly off-grid / organic (wabi-sabi), e.g. the wheel gently rotated.
- Combination cards as quiet plates: color bars with proportions, names
  beneath, no heavy frames.
- Fun through motion, not decoration: silky chord transitions, ribbons that
  bloom on hover, deal-the-cards animation on Surprise Me.
- Responsive: wheel scales down; side panels become bottom sheets on phones.
- All of the above expressed as design tokens in `src/styles/tokens.css`.

## Architecture & maintainability

This is a v1 with many iterations ahead, maintained entirely by Claude. The
architecture optimizes for that: every future session should find an obvious
place for new code, and expensive mistakes are prevented mechanically (by
tests and tooling), not just by documentation.

### Layered structure

```
scripts/ingest/       Data processing (runs at build time, not in browser).
                      Knowledge of the SOURCE format lives ONLY here.
data/raw/             Vendored source data (colors.json).
data/processed/       Stable internal format: schema-versioned, validated.
src/core/             Pure TypeScript kernel: types, data access, grouping,
                      aggregation, chord-matrix math, color math, export
                      formatters. NO React/D3/browser imports — enforced by
                      an automated test that fails CI on violation.
src/viz/              All D3 code (the chord diagram), quarantined behind a
                      single React wrapper component.
src/components/       React UI: header, panels, cards, filters, About.
src/styles/tokens.css Every design token (color/font/spacing) in ONE file.
```

### Rules that prevent tech debt

- **Core purity is mechanical:** a CI test fails if `src/core/` imports
  React, D3, or browser APIs. The kernel stays reusable for PWA/mobile.
- **Schema-versioned data:** processed data carries a `schemaVersion`;
  validated when the ingest script writes it and when the app loads it, so
  app and data cannot drift silently.
- **App state is one serializable object** (view, granularity, filters,
  selection) — makes future shareable deep links trivial instead of a
  rewrite.
- **Dependency budget:** react, react-dom, d3, vite, typescript, vitest —
  adding anything else requires a written justification in CLAUDE.md.
- **TypeScript strict mode**; small single-purpose files, each with a
  one-line header comment stating its purpose.
- **Deliberate YAGNI list** (recorded so future sessions don't "helpfully"
  add them): no state-management library, no router until there are real
  pages, no CSS framework, no plugin abstractions.

### Roadmap-proofing: future feature → what it touches

| Future feature | Touches |
|---|---|
| Nearest-color search ("match my hex") | `src/core/` color math + one UI input |
| PWA (installable, camera) | manifest + service worker; core unchanged |
| Native mobile app | consumes `src/core/` + processed data as-is |
| Replace/add data source (licensing) | `scripts/ingest/` only |
| Re-theme / aesthetic changes | `src/styles/tokens.css` only |
| Shareable deep links | serialize the existing state object into the URL |
| New view (e.g. grid of all 157) | new component + nav entry; core query added |

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
them current (enforced by instructions in CLAUDE.md). **Documentation must
ALWAYS be up to date and in sync with the code and with each other — wrong
documentation is worse than no documentation.** Any change that affects
setup, commands, structure, or behavior must update the affected docs in the
same commit.

- **README.md** — what the site is, plus complete setup and installation
  instructions (prerequisites, install, run, test, deploy), written for a
  non-JS reader.
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
  the rules from "Architecture & maintainability" (core purity, dependency
  budget with justifications, YAGNI list), conventions, and the explicit
  rule to keep all the above updated.

## Decisions log (brainstorming answers)

| Question | Decision |
|---|---|
| Primary experience | Visual explorer first — chord diagram is the homepage |
| Grouping | Granularity slider over 4 curated levels (157 / ~20 / ~10 / ~5) |
| Aesthetic | "Washi & Ink" japandi / wabi-sabi (chosen from 3 rendered mockups) |
| Personal branding | Owner's brand woven in subtly: warm neutrals + NYC orange `#F26522` (sparing accents) and blue `#236192` (links), from the owner's `_brand.yml` |
| Typography | Hybrid ("T3"): EB Garamond for wordmark & color names; Atkinson Hyperlegible for UI/body; Hyperlegible Mono for codes; all self-hosted |
| V1 features | Combination browser, color detail, copy & export, random inspiration |
| Tech stack | Vite + React + TypeScript (+ D3, Vitest) |
| Prompt tracking | PROMPTS.md, update rule recorded in CLAUDE.md |
| Idea tracking | TODO.md / TODO-completed.md with commit hashes |

## Stretch goal: mobile app

Eventually: an iOS/Android app for viewing colors on the phone, including
**take a photo → find related color combinations** (color output matching —
point the camera at a garment or print and get its nearest Sanzo Wada colors
and their book combinations).

Consequences for v1 architecture (cheap now, valuable later):

- Keep the data layer and core logic (grouping, aggregation, combination
  lookup, nearest-color math when it arrives) in **plain TypeScript modules
  with no React or browser dependencies**, so they can be reused by a React
  Native app or any other client later.
- The stable internal data format doubles as the mobile app's data contract.
- A likely intermediate step is a **PWA** (installable web app with camera
  access via the browser) before native apps — no app store needed. Recorded
  in TODO.md; no PWA work in v1.

## Out of scope for v1

- User accounts, saving favorites, sharing links to specific states
  (deep-linking may be a later TODO)
- Fetching live data at runtime
- Color-blindness simulation modes (candidate for TODO.md)
- Outfit/website mockup previews (candidate for TODO.md)
- Nearest-color search: paste an outside hex (brand color, paint chip,
  photo of a garment) and find the closest of the 157 colors and its
  combinations (candidate for TODO.md)
