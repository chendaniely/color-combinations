# Iro 色 — A Dictionary of Color Combinations

An interactive website for exploring the 348 color combinations from Sanzo
Wada's 1930s classic *A Dictionary of Color Combinations* — as a circular
chord-diagram "color wheel", a browsable gallery of combination plates, and
a practical palette picker for websites, presentations, and outfits.

> **Status:** v1 shipped (2026-07-19). Live at
> https://chendaniely.github.io/color-combinations/ — this README always
> reflects the current state of the project.

## What you need installed (one-time setup)

1. **Git** — you already have this if you cloned the repo.
2. **Node.js 20 or newer** — the JavaScript runtime that builds the site.
   - macOS with Homebrew: `brew install node`
   - Otherwise: download the LTS installer from https://nodejs.org
   - Check it worked: `node --version` (should print v20.x or higher)
3. **make** — preinstalled on macOS/Linux.

## Everyday commands

Run these from the project folder. `make help` lists them all.

| Command | What it does |
|---|---|
| `make install` | One-time (and after dependency changes): installs packages into `node_modules/` |
| `make dev` | Starts a local preview at the printed URL (usually http://localhost:5173/color-combinations/) with live reload |
| `make test` | Runs the automated tests |
| `make build` | Type-checks everything and builds the deployable site into `dist/` |
| `make preview` | Serves the built `dist/` exactly as GitHub Pages will |
| `make update-data` | Re-downloads the source colors and regenerates the processed data |
| `make clean` | Deletes build output and `node_modules/` |

## Features

- **Dress yourself** — hit Surprise me, or browse 2–3 color combinations in
  families you like wearing. Taller bars suggest the main garment; slivers
  are accents.
- **Build around what you own** — search for your item's color, open it, and
  see every combination the book endorses. Don't have the exact shade? Zoom
  the wheel out a level to see what pairs with blues, ochres, etc. in general.
- **Match** (header tab) — build an outfit palette: start from a shade, see
  what the book pairs it with, and add more shades to make a 3-, 4-, or
  more-color set. General shade-level matching, so colors don't have to be
  exact. Also reachable from any Shade or Family group on the wheel via "Build a palette from
  this →".
- **Theme a website or deck** — find a combination you love, then copy its hex
  codes, CSS variables, or JSON straight into your project.
- **Learn from the master** — set the wheel to Families or Groups and read the
  ribbons: their thickness is how often Wada combined those families. The
  coarse wheel is a lesson in what harmonizes.

## How this project is organized

- `src/` — the website's code. `src/core/` is pure logic (no browser code),
  `src/components/` is the UI, `src/viz/` is the D3 chord diagram.
- `data/raw/` — the vendored source data (downloaded from
  sanzo-wada.dmbk.io; the site never fetches it live). `data/processed/` —
  the generated, validated internal format the site actually reads.
  Regenerate any time with `make update-data`. If the source data ever has
  to change (e.g. licensing), only `scripts/ingest/` needs rewriting.
- `docs/superpowers/` — the design spec and implementation plans.
- `CLAUDE.md` — working rules for the AI sessions that maintain this repo.
- `PROMPTS.md` — the owner's prompts & decisions that shaped this project.
- `TODO.md` / `TODO-completed.md` — idea backlog and completed items.

## Renaming the site

The wordmark lives in `src/components/Header.tsx` and the browser-tab title
in `index.html` — change both, nothing else refers to the name.

## Deployment

Every push to `main` runs tests + typecheck + build in GitHub Actions and, if
green, publishes to GitHub Pages automatically. Nothing to do by hand.

- Live site: https://chendaniely.github.io/color-combinations/
- Pipeline: `.github/workflows/deploy.yml` (watch runs in the repo's Actions tab)
- If the repo is ever renamed, update `base` in `vite.config.ts` to match.
