# Sanzo Wada Color Combinations Explorer — v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the v1 static website that visualizes the 348 color combinations from Sanzo Wada's *A Dictionary of Color Combinations* as an interactive chord-diagram wheel with 4-level grouping, browse/detail/export/search features, per the approved spec.

**Spec:** `docs/superpowers/specs/2026-07-19-color-combinations-explorer-design.md` — read it before starting. Aesthetic references (open in browser): `docs/superpowers/specs/2026-07-19-aesthetic-mockups.html` (chosen: A "Washi & Ink"), `...-aesthetic-brand-mockups.html` (chosen: A1 subtle brand), `...-typography-mockups.html` (chosen: T3 hybrid).

**Architecture:** A data-processing script transforms vendored source JSON into a schema-versioned internal format. A pure-TypeScript kernel (`src/core/`, mechanically forbidden from importing React/D3/browser APIs) holds all logic. React renders the UI; all D3 code is quarantined in `src/viz/`. GitHub Actions tests, builds, and deploys to GitHub Pages.

**Tech Stack:** Vite + React 19 + TypeScript (strict) + D3 7, tested with Vitest. No router, no state library, no CSS framework.

## Global Constraints

Every task implicitly includes these. Copy-paste values exactly.

- **Dependency budget:** runtime: `react`, `react-dom`, `d3`. Dev: `vite`, `typescript`, `vitest`, `@vitejs/plugin-react`, `tsx`, `@types/react`, `@types/react-dom`, `@types/d3`, `@types/node`. Adding ANYTHING else requires written justification in CLAUDE.md's "Dependency budget" section.
- **Core purity:** files in `src/core/` may import **only** other `src/core/` files via relative paths — no packages, no `window`/`document`/`navigator`/`localStorage`/`fetch`. Enforced by `tests/core-purity.test.ts`.
- **Docs in sync, same commit:** any change affecting setup, commands, structure, or behavior updates README.md / Makefile / CLAUDE.md / TODO.md in the SAME commit. Wrong documentation is worse than no documentation.
- **PROMPTS.md** is append-only chronological; never rewrite history.
- **Data quirks policy:** the 10 one-color combinations get `excluded: true` (kept in data, hidden in UI); the 3 five-color combinations display under the "4" filter; Vandar Poel's Blue shows "appears in no combinations" — never hidden, never faked.
- **Palette tokens (from owner's brand):** paper `#F8F6F2`→`#F0EBE2`, ink `#2F2A26`, muted `#7E7468`, faint `#B8AEA2`, hairline `#E8DDD2`, orange accent `#F26522` (ONLY: seal, active-nav underline, slider active stop, hover states), blue `#236192` (links/info only). Sanzo Wada's colors always keep their own values.
- **Typography:** EB Garamond = wordmark + color/combination names only; Atkinson Hyperlegible = all UI/body; Atkinson Hyperlegible Mono = color codes. Self-hosted woff2, no font CDN at runtime.
- **Wordmark:** `Iro 色` ; HTML title: `Iro — A Dictionary of Color Combinations`. (Renaming later = `Header.tsx` + `index.html`, documented in README.)
- **Site base path:** `/color-combinations/` (GitHub Pages project site).
- **Node:** ≥ 20 locally; CI uses 24.
- **Commit style:** end every commit message body with `Co-Authored-By: Claude <noreply@anthropic.com>` per harness rules; small frequent commits, one per plan step that says "Commit".

## File Map (end state)

```
index.html                      Vite entry HTML
package.json / package-lock.json
tsconfig.json
vite.config.ts                  base path + vitest config
Makefile                        install/dev/test/build/preview/update-data/clean
README.md                       what+why+full setup for a non-JS reader
CLAUDE.md                       rules & map for future Claude sessions
PROMPTS.md                      append-only log of owner prompts & decisions
TODO.md                         deferred ideas
TODO-completed.md               done items + commit hashes
.github/workflows/deploy.yml    test+build+deploy to Pages
data/raw/colors.json            vendored source (dmbk.io)
data/raw/retrieved-on.txt       date stamp for reproducible ingest
data/processed/colors-data.json generated internal format (committed)
scripts/ingest/preview-hues.ts  terminal swatch helper for curation
scripts/ingest/curation.ts      authored grouping hierarchy (DATA, hand-curated)
scripts/ingest/rawTypes.ts      source-format types (ONLY file that knows them)
scripts/ingest/transform.ts     raw → Dataset
scripts/ingest/ingest.ts        CLI: read raw, transform, validate, write
src/main.tsx                    React mount
src/App.tsx                     state wiring + layout
src/data.ts                     imports processed JSON, validates, indexes
src/copy.ts                     clipboard util
src/exportPng.ts                canvas PNG plate download
src/core/colorMath.ts           hex/rgb/hsl/hue/neutral/contrast — pure
src/core/types.ts               Dataset schema types + SCHEMA_VERSION
src/core/validate.ts            validateDataset(unknown): Dataset
src/core/dataset.ts             index() + query functions
src/core/chord.ts               wheelNodes/chordMatrix/combosForPair
src/core/export.ts              cssVariablesFor/jsonFor
src/core/state.ts               AppState + reducer (pure)
src/viz/chordRender.ts          ALL D3 code lives here
src/components/Header.tsx
src/components/ChordWheel.tsx   thin React wrapper around chordRender
src/components/WheelControls.tsx
src/components/BrowseView.tsx
src/components/PlateCard.tsx
src/components/Panel.tsx        slide-in shell
src/components/ColorDetail.tsx
src/components/CombinationDetail.tsx
src/components/GroupDetail.tsx
src/components/RibbonDetail.tsx
src/components/SearchBox.tsx
src/components/AboutPanel.tsx
src/components/CopyField.tsx
src/styles/tokens.css           EVERY design token
src/styles/fonts.css            @font-face (self-hosted)
src/styles/app.css              layout + component styles
src/assets/fonts/*.woff2
public/favicon.svg
tests/*.test.ts(x)              vitest; fixtures in tests/fixtures/
```

**Testing strategy:** TDD for everything pure (core, ingest, state — the majority of the logic). UI tasks get a `renderToString` smoke test plus explicit browser verification checklists (`make dev`); D3 interaction is verified manually per checklist since jsdom would require new dependencies for little value.

---

### Task 1: Project scaffold + documentation contract

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `public/favicon.svg`, `Makefile`, `README.md`, `CLAUDE.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: working `make install / dev / build / preview`; npm scripts `dev/build/preview/test/ingest`; the documentation files every later task appends to.

- [ ] **Step 1: Write config files**

`package.json`:

```json
{
  "name": "color-combinations",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "ingest": "tsx scripts/ingest/ingest.ts"
  },
  "dependencies": {
    "d3": "^7.9.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/d3": "^7.4.3",
    "@types/node": "^24.0.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.5.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

(If `npm install` reports a version doesn't exist, use the closest available major — record the actual resolved versions in this file via the normal lockfile, no pinning beyond `^`.)

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "scripts", "tests", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/color-combinations/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    passWithNoTests: true,
  },
})
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Iro — A Dictionary of Color Combinations</title>
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(<h1>Iro 色</h1>)
```

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#F26522"/>
  <text x="16" y="23" font-size="19" text-anchor="middle" fill="#F8F6F2" font-family="serif">色</text>
</svg>
```

Append to `.gitignore` (keep the existing `.superpowers/` line):

```
node_modules/
dist/
```

- [ ] **Step 2: Write the Makefile**

```make
NPM := npm

.PHONY: help install dev test build preview clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-14s %s\n", $$1, $$2}'

install: ## Install dependencies (needs Node.js >= 20 — see README)
	$(NPM) install

dev: ## Run the site locally with live reload
	$(NPM) run dev

test: ## Run all tests once
	$(NPM) test

build: ## Typecheck and build the production site into dist/
	$(NPM) run build

preview: ## Serve the built dist/ locally
	$(NPM) run preview

clean: ## Remove build output and installed dependencies
	rm -rf dist node_modules
```

(`update-data` is added in Task 6, when the ingest script it calls actually exists — the Makefile must never document commands that don't work yet.)

- [ ] **Step 3: Write README.md**

```markdown
# Iro 色 — A Dictionary of Color Combinations

An interactive website for exploring the 348 color combinations from Sanzo
Wada's 1930s classic *A Dictionary of Color Combinations* — as a circular
chord-diagram "color wheel", a browsable gallery of combination plates, and
a practical palette picker for websites, presentations, and outfits.

> **Status:** under construction. This README always reflects the current
> state of the project.

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
| `make clean` | Deletes build output and `node_modules/` |

## How this project is organized

- `src/` — the website's code. `src/core/` is pure logic (no browser code),
  `src/components/` is the UI, `src/viz/` is the D3 chord diagram.
- `data/` — `raw/` is the vendored source data; `processed/` is the
  generated internal format the site actually reads.
- `docs/superpowers/` — the design spec and implementation plans.
- `CLAUDE.md` — working rules for the AI sessions that maintain this repo.
- `PROMPTS.md` — the owner's prompts & decisions that shaped this project.
- `TODO.md` / `TODO-completed.md` — idea backlog and completed items.

## Renaming the site

The wordmark lives in `src/components/Header.tsx` and the browser-tab title
in `index.html` — change both, nothing else refers to the name.

## Deployment

Set up in a later task — this section will describe the GitHub Pages
pipeline once it exists.
```

- [ ] **Step 4: Write CLAUDE.md**

```markdown
# CLAUDE.md — working rules for this repo

This project is **fully vibe-coded**: the owner does not read
JavaScript/HTML/CSS. You (Claude) are the only maintainer. These rules are
non-negotiable.

## The documentation contract

**Wrong documentation is worse than no documentation.** Any change that
affects setup, commands, structure, or behavior MUST update the affected
docs in the SAME commit:

- `README.md` — what the site is + complete setup/run/deploy instructions,
  written for a non-JS reader. Never document a command that doesn't work.
- `Makefile` — must always match reality; every target works.
- `PROMPTS.md` — append-only log of the owner's prompts and decisions.
  **Every session: append the owner's prompts (verbatim) and the choices
  they made.** Someone should be able to re-create this site from it.
- `TODO.md` — ideas/items deliberately deferred. Add anything skipped.
- `TODO-completed.md` — move items here when done, WITH the commit hash
  that completed them.
- The spec (`docs/superpowers/specs/`) — update if the design changes.

## Architecture rules (see spec for rationale)

- `src/core/` is a **pure TypeScript kernel**: only relative imports of
  other core files; no React, D3, or browser globals. Enforced by
  `tests/core-purity.test.ts` — never weaken that test.
- The app reads ONLY `data/processed/colors-data.json` (schema-versioned,
  validated). Source-format knowledge lives ONLY in `scripts/ingest/`.
- App state is one serializable object (`src/core/state.ts`).
- Every design token (color/font/spacing/motion) lives in
  `src/styles/tokens.css`. No hard-coded colors in components — Sanzo
  Wada's data colors excepted.
- All D3 code stays in `src/viz/`.

## Dependency budget

Runtime: react, react-dom, d3. Dev: vite, typescript, vitest,
@vitejs/plugin-react, tsx, @types/react, @types/react-dom, @types/d3,
@types/node.

Justifications: tsx = run TypeScript scripts under Node (ingest);
@vitejs/plugin-react = Vite's React glue; @types/* = TypeScript
definitions. **Adding any other dependency requires appending a
justification line here in the same commit.**

## Deliberate YAGNI (do NOT add these "helpfully")

No state-management library. No router (single page). No CSS framework.
No plugin abstractions. No runtime data fetching (data is bundled).

## Aesthetic

"Washi & Ink": japandi/wabi-sabi + owner's brand (NYC orange #F26522
sparingly, blue #236192 links, warm neutrals). Tokens in
`src/styles/tokens.css`; rendered references in
`docs/superpowers/specs/2026-07-19-*-mockups.html`. Typography: EB Garamond
(names/wordmark only), Atkinson Hyperlegible (UI), Hyperlegible Mono
(codes).

## Commands

`make help` lists everything. Verify `make test` and `make build` pass
before claiming any task complete.
```

- [ ] **Step 5: Write PROMPTS.md (backfill from the design sessions)**

```markdown
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
```

- [ ] **Step 6: Write TODO.md and TODO-completed.md**

`TODO.md`:

```markdown
# TODO — deferred ideas (so nothing gets forgotten)

Move finished items to TODO-completed.md with the commit hash.

- [ ] Nearest-color search: paste any hex (brand color, paint chip) → find
      the closest of the 157 colors and its combinations
- [ ] PWA: installable web app with camera access ("photo → related
      combinations") — stepping stone to native
- [ ] Native iOS/Android app reusing src/core/ and the processed data
- [ ] Shareable deep links (serialize the app-state object into the URL)
- [ ] Color-blindness simulation modes
- [ ] Outfit / website mockup previews using a chosen combination
- [ ] Fancy shared-element morph animation between granularity levels
      (v1 ships a crossfade)
- [ ] Research the book's true plate area ratios (v1 uses a decorative
      taper; data source has no proportions)
```

`TODO-completed.md`:

```markdown
# TODO — completed

Format: `- [x] item — done in <commit hash> (YYYY-MM-DD)`
```

- [ ] **Step 7: Install and verify**

Run: `make install`
Expected: completes without errors, `package-lock.json` created.

Run: `make build`
Expected: `tsc` passes, Vite writes `dist/`.

Run: `make dev` (background or second terminal), open the printed URL (note the `/color-combinations/` path).
Expected: page shows "Iro 色", favicon is an orange 色 square. Stop the server.

Run: `make test`
Expected: passes (no test files yet — `passWithNoTests`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite+React+TS project with documentation contract"
```

---

### Task 2: Core purity guard + color math

**Files:**
- Create: `src/core/colorMath.ts`
- Test: `tests/core-purity.test.ts`, `tests/colorMath.test.ts`

**Interfaces:**
- Produces: `type RGB = [number, number, number]`; `hexToRgb(hex: string): RGB`; `rgbToHsl(rgb: RGB): { h: number; s: number; l: number }` (h in 0–360, s/l in 0–1); `hueOf(hex: string): number`; `isNeutral(hex: string): boolean`; `readableTextOn(hex: string): 'dark' | 'light'`.

- [ ] **Step 1: Write the failing tests**

`tests/core-purity.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const CORE = 'src/core'

function coreFiles(dir = CORE): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return coreFiles(p)
    return p.endsWith('.ts') ? [p] : []
  })
}

describe('core purity (never weaken this test — see CLAUDE.md)', () => {
  it('src/core exists and has files', () => {
    expect(coreFiles().length).toBeGreaterThan(0)
  })

  it('core files import only other core files', () => {
    for (const file of coreFiles()) {
      const src = readFileSync(file, 'utf8')
      const specs = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
      for (const spec of specs) {
        expect(
          spec.startsWith('./') || spec.startsWith('../'),
          `${file} imports package "${spec}" — core may only import core`,
        ).toBe(true)
        const target = resolve(dirname(file), spec)
        expect(
          target.startsWith(resolve(CORE)),
          `${file} imports "${spec}" which resolves outside src/core`,
        ).toBe(true)
      }
    }
  })

  it('core files never touch browser globals', () => {
    for (const file of coreFiles()) {
      const src = readFileSync(file, 'utf8')
      expect(
        /\b(window|document|navigator|localStorage|fetch)\s*[.([]/.test(src),
        `${file} references a browser global`,
      ).toBe(false)
    }
  })
})
```

`tests/colorMath.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  hexToRgb, hueOf, isNeutral, readableTextOn, rgbToHsl,
} from '../src/core/colorMath'

describe('colorMath', () => {
  it('parses hex', () => {
    expect(hexToRgb('#ffb3f0')).toEqual([255, 179, 240])
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
  })
  it('converts to hsl', () => {
    expect(rgbToHsl([255, 0, 0]).h).toBeCloseTo(0)
    expect(rgbToHsl([0, 255, 0]).h).toBeCloseTo(120)
    expect(rgbToHsl([255, 255, 255]).l).toBeCloseTo(1)
    expect(rgbToHsl([255, 255, 255]).s).toBeCloseTo(0)
  })
  it('hueOf matches known colors', () => {
    expect(hueOf('#ffb3f0')).toBeGreaterThan(300) // Hermosa Pink ≈ 316
    expect(hueOf('#ffb3f0')).toBeLessThan(330)
  })
  it('flags neutrals by low saturation', () => {
    expect(isNeutral('#808080')).toBe(true)
    expect(isNeutral('#ff3319')).toBe(false)
  })
  it('picks readable text color', () => {
    expect(readableTextOn('#1b3644')).toBe('light') // dark slate → light text
    expect(readableTextOn('#ffcfc4')).toBe('dark')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/colorMath.test.ts tests/core-purity.test.ts`
Expected: FAIL — cannot resolve `../src/core/colorMath` (and purity test fails on "src/core exists").

- [ ] **Step 3: Implement `src/core/colorMath.ts`**

```ts
// Pure color math. Core kernel: no imports outside src/core.

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export function rgbToHsl([r, g, b]: RGB): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = 60 * (((gn - bn) / d) % 6)
  else if (max === gn) h = 60 * ((bn - rn) / d + 2)
  else h = 60 * ((rn - gn) / d + 4)
  if (h < 0) h += 360
  return { h, s, l }
}

export function hueOf(hex: string): number {
  return rgbToHsl(hexToRgb(hex)).h
}

const NEUTRAL_SATURATION = 0.14

export function isNeutral(hex: string): boolean {
  return rgbToHsl(hexToRgb(hex)).s < NEUTRAL_SATURATION
}

export function readableTextOn(hex: string): 'dark' | 'light' {
  const [r, g, b] = hexToRgb(hex)
  // Perceived luminance (ITU-R BT.601)
  const luma = 0.299 * r + 0.587 * g + 0.114 * b
  return luma > 150 ? 'dark' : 'light'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `make test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core tests
git commit -m "feat: core color math + mechanical core-purity guard"
```

---

### Task 3: Dataset schema types + validator

**Files:**
- Create: `src/core/types.ts`, `src/core/validate.ts`, `tests/fixtures/miniDataset.ts`
- Test: `tests/validate.test.ts`

**Interfaces:**
- Produces (used by every later task):

```ts
// src/core/types.ts
export const SCHEMA_VERSION = 1
export type { RGB } from './colorMath'   // re-export
export type CMYK = [number, number, number, number]
export interface ColorRecord {
  id: number            // source "index", stable
  name: string
  slug: string
  hex: string           // lowercase #rrggbb
  rgb: RGB
  cmyk: CMYK
  hue: number           // precomputed, 0–360
  fineId: string        // fine-family membership (level 1)
  combinationIds: number[]
}
export interface CombinationRecord {
  id: number
  colorIds: number[]    // ascending
  size: number          // colorIds.length
  excluded: boolean     // quirks policy: true for 1-color combos
}
export interface GroupNode {
  id: string            // kebab-case
  name: string
  parentId: string | null  // fine→broad id, broad→super id, super→null
}
export interface Dataset {
  schemaVersion: number
  source: { name: string; url: string; retrievedOn: string }
  colors: ColorRecord[]
  combinations: CombinationRecord[]
  groups: { fine: GroupNode[]; broad: GroupNode[]; super: GroupNode[] }
  // group display order = array order in each list
}
export type GranularityLevel = 0 | 1 | 2 | 3   // colors/fine/broad/super
export type SizeBucket = 2 | 3 | 4             // 4 includes 5-color combos
```

- `validateDataset(data: unknown): Dataset` — returns the typed dataset or throws `Error` with a message naming the first problem found.

- [ ] **Step 1: Write the fixture** — `tests/fixtures/miniDataset.ts`, a tiny valid `Dataset` reused by many later tests. It must exercise every structure: 6 colors across 3 fine / 2 broad / 2 super groups, 5 combinations including one `excluded` single-color combo and one 5-color combo, and one color with no combinations.

```ts
import type { Dataset } from '../../src/core/types'
import { SCHEMA_VERSION } from '../../src/core/types'

// 6 colors: two pinks, one red, two blues, one gray (gray has no combos).
export const mini: Dataset = {
  schemaVersion: SCHEMA_VERSION,
  source: { name: 'test', url: 'https://example.com', retrievedOn: '2026-07-19' },
  colors: [
    { id: 1, name: 'Test Pink A', slug: 'test-pink-a', hex: '#ffa6d9', rgb: [255, 166, 217], cmyk: [0, 35, 15, 0], hue: 325.6, fineId: 'dusty-pinks', combinationIds: [10, 12, 14] },
    { id: 2, name: 'Test Pink B', slug: 'test-pink-b', hex: '#ffb3f0', rgb: [255, 179, 240], cmyk: [0, 30, 6, 0], hue: 316.6, fineId: 'dusty-pinks', combinationIds: [11, 14] },
    { id: 3, name: 'Test Red', slug: 'test-red', hex: '#ff3319', rgb: [255, 51, 25], cmyk: [0, 80, 90, 0], hue: 6.8, fineId: 'true-reds', combinationIds: [11, 13, 14] },
    { id: 4, name: 'Test Blue A', slug: 'test-blue-a', hex: '#236192', rgb: [35, 97, 146], cmyk: [76, 34, 0, 43], hue: 206.5, fineId: 'deep-blues', combinationIds: [10, 12, 14] },
    { id: 5, name: 'Test Blue B', slug: 'test-blue-b', hex: '#1b3644', rgb: [27, 54, 68], cmyk: [60, 21, 0, 73], hue: 200.5, fineId: 'deep-blues', combinationIds: [12, 13, 14] },
    { id: 6, name: 'Test Gray', slug: 'test-gray', hex: '#808080', rgb: [128, 128, 128], cmyk: [0, 0, 0, 50], hue: 0, fineId: 'grays', combinationIds: [] },
  ],
  combinations: [
    { id: 10, colorIds: [1, 4], size: 2, excluded: false },
    { id: 11, colorIds: [2, 3], size: 2, excluded: false },
    { id: 12, colorIds: [1, 4, 5], size: 3, excluded: false },
    { id: 13, colorIds: [3], size: 1, excluded: true },
    { id: 14, colorIds: [1, 2, 3, 4, 5], size: 5, excluded: false },
  ],
  groups: {
    fine: [
      { id: 'dusty-pinks', name: 'Dusty Pinks', parentId: 'pink' },
      { id: 'true-reds', name: 'True Reds', parentId: 'red' },
      { id: 'deep-blues', name: 'Deep Blues', parentId: 'blue' },
      { id: 'grays', name: 'Grays', parentId: 'blue' },
    ],
    broad: [
      { id: 'pink', name: 'Pink', parentId: 'warm' },
      { id: 'red', name: 'Red', parentId: 'warm' },
      { id: 'blue', name: 'Blue', parentId: 'cool' },
    ],
    super: [
      { id: 'warm', name: 'Warm', parentId: null },
      { id: 'cool', name: 'Cool', parentId: null },
    ],
  },
}
```

(Note: combination 13 is `[3]` and color 3 lists 13 — intentionally mirrors the real data's one-color quirk. `grays` parenting to `blue` is arbitrary but valid — the validator checks structure, not taste.)

- [ ] **Step 2: Write the failing tests** — `tests/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateDataset } from '../src/core/validate'
import { mini } from './fixtures/miniDataset'

function clone(): typeof mini {
  return structuredClone(mini)
}

describe('validateDataset', () => {
  it('accepts a valid dataset and returns it typed', () => {
    expect(validateDataset(mini)).toBe(mini)
  })
  it('rejects non-objects', () => {
    expect(() => validateDataset(null)).toThrow(/not an object/i)
  })
  it('rejects wrong schemaVersion', () => {
    const d = clone(); d.schemaVersion = 99
    expect(() => validateDataset(d)).toThrow(/schemaVersion/)
  })
  it('rejects a color with unknown fineId', () => {
    const d = clone(); d.colors[0].fineId = 'nope'
    expect(() => validateDataset(d)).toThrow(/fineId "nope"/)
  })
  it('rejects a fine group with unknown broad parent', () => {
    const d = clone(); d.groups.fine[0].parentId = 'nope'
    expect(() => validateDataset(d)).toThrow(/parentId "nope"/)
  })
  it('rejects a combination referencing a missing color', () => {
    const d = clone(); d.combinations[0].colorIds = [1, 999]
    expect(() => validateDataset(d)).toThrow(/999/)
  })
  it('rejects size mismatch', () => {
    const d = clone(); d.combinations[0].size = 3
    expect(() => validateDataset(d)).toThrow(/size/)
  })
  it('rejects malformed hex', () => {
    const d = clone(); d.colors[0].hex = 'ffa6d9'
    expect(() => validateDataset(d)).toThrow(/hex/)
  })
  it('rejects duplicate color ids', () => {
    const d = clone(); d.colors[1].id = 1
    expect(() => validateDataset(d)).toThrow(/duplicate/i)
  })
  it('rejects mismatched color↔combination cross-references', () => {
    const d = clone(); d.colors[0].combinationIds = [10]
    expect(() => validateDataset(d)).toThrow(/cross-reference/i)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL — cannot resolve `../src/core/validate`.

- [ ] **Step 4: Implement** — `src/core/types.ts` exactly as in the Interfaces block above, and `src/core/validate.ts`:

```ts
// Validates that unknown data conforms to the Dataset contract.
// Core kernel: no imports outside src/core.
import type { Dataset } from './types'
import { SCHEMA_VERSION } from './types'

function fail(msg: string): never {
  throw new Error(`Invalid dataset: ${msg}`)
}

const HEX = /^#[0-9a-f]{6}$/

export function validateDataset(data: unknown): Dataset {
  if (typeof data !== 'object' || data === null) fail('not an object')
  const d = data as Dataset

  if (d.schemaVersion !== SCHEMA_VERSION) {
    fail(`schemaVersion ${d.schemaVersion} != expected ${SCHEMA_VERSION}`)
  }
  if (!d.source?.name || !d.source?.retrievedOn) fail('missing source info')
  if (!Array.isArray(d.colors) || d.colors.length === 0) fail('colors missing')
  if (!Array.isArray(d.combinations)) fail('combinations missing')

  const superIds = new Set(d.groups.super.map((g) => g.id))
  const broadIds = new Set(d.groups.broad.map((g) => g.id))
  const fineIds = new Set(d.groups.fine.map((g) => g.id))
  if (superIds.size !== d.groups.super.length) fail('duplicate super group id')
  if (broadIds.size !== d.groups.broad.length) fail('duplicate broad group id')
  if (fineIds.size !== d.groups.fine.length) fail('duplicate fine group id')

  for (const g of d.groups.super) {
    if (g.parentId !== null) fail(`super group "${g.id}" has non-null parent`)
  }
  for (const g of d.groups.broad) {
    if (g.parentId === null || !superIds.has(g.parentId)) {
      fail(`broad group "${g.id}" parentId "${g.parentId}" not a super group`)
    }
  }
  for (const g of d.groups.fine) {
    if (g.parentId === null || !broadIds.has(g.parentId)) {
      fail(`fine group "${g.id}" parentId "${g.parentId}" not a broad group`)
    }
  }

  const colorIds = new Set<number>()
  for (const c of d.colors) {
    if (colorIds.has(c.id)) fail(`duplicate color id ${c.id}`)
    colorIds.add(c.id)
    if (!HEX.test(c.hex)) fail(`color ${c.id} hex "${c.hex}" is not #rrggbb`)
    if (!fineIds.has(c.fineId)) fail(`color ${c.id} fineId "${c.fineId}" unknown`)
    if (c.rgb.length !== 3) fail(`color ${c.id} rgb malformed`)
    if (c.cmyk.length !== 4) fail(`color ${c.id} cmyk malformed`)
  }

  const comboIds = new Set<number>()
  for (const combo of d.combinations) {
    if (comboIds.has(combo.id)) fail(`duplicate combination id ${combo.id}`)
    comboIds.add(combo.id)
    if (combo.size !== combo.colorIds.length) {
      fail(`combination ${combo.id} size ${combo.size} != ${combo.colorIds.length} colors`)
    }
    if (combo.excluded !== (combo.size < 2)) {
      fail(`combination ${combo.id} excluded flag inconsistent with size`)
    }
    for (const id of combo.colorIds) {
      if (!colorIds.has(id)) fail(`combination ${combo.id} references missing color ${id}`)
    }
  }

  // Cross-references must agree both ways.
  for (const c of d.colors) {
    for (const comboId of c.combinationIds) {
      if (!comboIds.has(comboId)) {
        fail(`cross-reference: color ${c.id} lists missing combination ${comboId}`)
      }
    }
  }
  for (const combo of d.combinations) {
    for (const id of combo.colorIds) {
      const color = d.colors.find((c) => c.id === id)!
      if (!color.combinationIds.includes(combo.id)) {
        fail(`cross-reference: combination ${combo.id} lists color ${id} but not vice versa`)
      }
    }
  }

  return d
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `make test`
Expected: all PASS (validate + colorMath + purity — purity now also covers types/validate).

- [ ] **Step 6: Commit**

```bash
git add src/core tests
git commit -m "feat: dataset schema types and validator"
```

### Task 4: Vendor raw data + curation hierarchy

The grouping hierarchy is **authored data**, not derived — this task creates it with algorithmic help and locks it with tests.

**Files:**
- Create: `data/raw/colors.json` (downloaded), `data/raw/retrieved-on.txt`, `scripts/ingest/rawTypes.ts`, `scripts/ingest/preview-hues.ts`, `scripts/ingest/curation.ts`
- Test: `tests/curation.test.ts`

**Interfaces:**
- Produces:

```ts
// scripts/ingest/rawTypes.ts — the ONLY file that knows the source shape
export interface RawColor {
  index: number
  name: string
  slug: string
  hex: string
  rgb_array: number[]
  cmyk_array: number[]
  combinations: number[]
  use_count: number
}
export interface RawFile { colors: RawColor[] }
```

```ts
// scripts/ingest/curation.ts
export interface Curation {
  superGroups: { id: string; name: string }[]                    // display order
  broadFamilies: { id: string; name: string; superId: string }[] // display order
  fineFamilies: { id: string; name: string; broadId: string }[]  // display order
  assignments: Record<string, string>  // color slug → fineFamilies id (all 157)
}
export const curation: Curation
```

- [ ] **Step 1: Vendor the raw data**

```bash
mkdir -p data/raw
curl -fsSL https://sanzo-wada.dmbk.io/assets/colors.json -o data/raw/colors.json
date +%F > data/raw/retrieved-on.txt
```

Verify: `python3 -c "import json; d=json.load(open('data/raw/colors.json')); print(len(d['colors']))"` → `157`.

- [ ] **Step 2: Write `scripts/ingest/rawTypes.ts`** (content above) and the curation helper `scripts/ingest/preview-hues.ts`:

```ts
// Prints all 157 colors as ANSI swatches sorted by hue — an aid for hand-
// curating the grouping hierarchy. Run: npx tsx scripts/ingest/preview-hues.ts
import { readFileSync } from 'node:fs'
import { hexToRgb, hueOf, isNeutral, rgbToHsl } from '../../src/core/colorMath'
import type { RawFile } from './rawTypes'

const raw = JSON.parse(readFileSync('data/raw/colors.json', 'utf8')) as RawFile

const rows = raw.colors
  .map((c) => ({ ...c, hue: hueOf(c.hex), neutral: isNeutral(c.hex), l: rgbToHsl(hexToRgb(c.hex)).l }))
  .sort((a, b) => Number(a.neutral) - Number(b.neutral) || a.hue - b.hue || a.l - b.l)

for (const c of rows) {
  const [r, g, b] = hexToRgb(c.hex)
  const block = `\x1b[48;2;${r};${g};${b}m        \x1b[0m`
  const tag = c.neutral ? 'NEUTRAL' : `h${c.hue.toFixed(0).padStart(3)}`
  console.log(`${block} ${tag} l${c.l.toFixed(2)} ${c.slug} (${c.name})`)
}
```

- [ ] **Step 3: Author `scripts/ingest/curation.ts`**

Run `npx tsx scripts/ingest/preview-hues.ts` and use the swatch listing to assign every color. Fixed skeleton (use exactly these super groups and broad families):

```ts
export interface Curation {
  superGroups: { id: string; name: string }[]
  broadFamilies: { id: string; name: string; superId: string }[]
  fineFamilies: { id: string; name: string; broadId: string }[]
  assignments: Record<string, string>
}

export const curation: Curation = {
  superGroups: [
    { id: 'warm', name: 'Warm' },
    { id: 'cool', name: 'Cool' },
    { id: 'earthy', name: 'Earthy' },
    { id: 'neutral', name: 'Neutral' },
  ],
  broadFamilies: [
    { id: 'pink', name: 'Pink', superId: 'warm' },
    { id: 'red', name: 'Red', superId: 'warm' },
    { id: 'orange', name: 'Orange', superId: 'warm' },
    { id: 'yellow', name: 'Yellow', superId: 'warm' },
    { id: 'green', name: 'Green', superId: 'cool' },
    { id: 'teal', name: 'Teal', superId: 'cool' },
    { id: 'blue', name: 'Blue', superId: 'cool' },
    { id: 'purple', name: 'Purple', superId: 'cool' },
    { id: 'brown', name: 'Brown', superId: 'earthy' },
    { id: 'gray', name: 'Gray & Ivory', superId: 'neutral' },
  ],
  fineFamilies: [
    // ~18–22 total, authored while looking at the swatches. Naming style:
    // evocative but plain — "Blush Pinks", "Hot Pinks", "Scarlets",
    // "Vermilions", "Ochres", "Olives", "Spring Greens", "Sea Greens",
    // "Sky Blues", "Deep Blues", "Violets", "Mauves", "Tans", "Umbers",
    // "Ivories", "Slate Grays"... Each { id, name, broadId }.
  ],
  assignments: {
    // all 157 slugs, e.g.:
    // 'hermosa-pink': 'blush-pinks',
    // 'corinthian-pink': 'blush-pinks',
    // ...
  },
}
```

Judgment rules while assigning: trust your eye over the hue number for border cases (olive → green vs yellow: pick where a person dressing themselves would look for it); `isNeutral` colors go under `gray` fines unless clearly tinted; aim for 5–12 colors per fine family; every fine family non-empty.

- [ ] **Step 4: Write the failing tests** — `tests/curation.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { curation } from '../scripts/ingest/curation'
import type { RawFile } from '../scripts/ingest/rawTypes'

const raw = JSON.parse(readFileSync('data/raw/colors.json', 'utf8')) as RawFile
const slugs = raw.colors.map((c) => c.slug)

describe('curation hierarchy', () => {
  it('assigns every one of the 157 colors exactly once', () => {
    expect(slugs).toHaveLength(157)
    for (const slug of slugs) {
      expect(curation.assignments[slug], `missing assignment for ${slug}`).toBeDefined()
    }
    expect(Object.keys(curation.assignments)).toHaveLength(157)
  })
  it('every assignment points at a defined fine family', () => {
    const fineIds = new Set(curation.fineFamilies.map((f) => f.id))
    for (const [slug, fineId] of Object.entries(curation.assignments)) {
      expect(fineIds.has(fineId), `${slug} → unknown fine "${fineId}"`).toBe(true)
    }
  })
  it('every fine family is non-empty and parented to a broad family', () => {
    const broadIds = new Set(curation.broadFamilies.map((b) => b.id))
    const used = new Set(Object.values(curation.assignments))
    for (const f of curation.fineFamilies) {
      expect(broadIds.has(f.broadId), `fine "${f.id}" → unknown broad`).toBe(true)
      expect(used.has(f.id), `fine family "${f.id}" has no colors`).toBe(true)
    }
  })
  it('every broad family is parented to a super group', () => {
    const superIds = new Set(curation.superGroups.map((s) => s.id))
    for (const b of curation.broadFamilies) {
      expect(superIds.has(b.superId), `broad "${b.id}" → unknown super`).toBe(true)
    }
  })
  it('fine family count is in the target range', () => {
    expect(curation.fineFamilies.length).toBeGreaterThanOrEqual(16)
    expect(curation.fineFamilies.length).toBeLessThanOrEqual(24)
  })
})
```

- [ ] **Step 5: Run tests; iterate on the curation until they pass**

Run: `npx vitest run tests/curation.test.ts`
Expected: PASS. The completeness test WILL catch every forgotten slug by name — work through the failures.

- [ ] **Step 6: Sanity-check with human eyes**

Re-run `npx tsx scripts/ingest/preview-hues.ts`, then spot-check: do the pinks all sit in pink fines? Is `vandar-poels-blue` in a blue fine? Fix any obvious misfiles.

- [ ] **Step 7: Commit**

```bash
git add data/raw scripts/ingest tests/curation.test.ts
git commit -m "feat: vendor raw Sanzo Wada data + hand-curated grouping hierarchy"
```

---

### Task 5: Ingest transform (raw → Dataset)

**Files:**
- Create: `scripts/ingest/transform.ts`
- Test: `tests/transform.test.ts`

**Interfaces:**
- Consumes: `RawFile` (Task 4), `Curation` (Task 4), `Dataset`/`SCHEMA_VERSION` (Task 3), `hueOf` (Task 2).
- Produces: `transform(raw: RawFile, curation: Curation, retrievedOn: string): Dataset`

- [ ] **Step 1: Write the failing tests** — `tests/transform.test.ts` (runs on the REAL vendored data; the numbers are facts about it):

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateDataset } from '../src/core/validate'
import { curation } from '../scripts/ingest/curation'
import type { RawFile } from '../scripts/ingest/rawTypes'
import { transform } from '../scripts/ingest/transform'

const raw = JSON.parse(readFileSync('data/raw/colors.json', 'utf8')) as RawFile
const ds = transform(raw, curation, '2026-07-19')

describe('transform on real data', () => {
  it('produces a valid dataset', () => {
    expect(() => validateDataset(ds)).not.toThrow()
  })
  it('carries all 157 colors and reconstructs all 348 combinations', () => {
    expect(ds.colors).toHaveLength(157)
    expect(ds.combinations).toHaveLength(348)
  })
  it('applies the quirks policy: sizes and exclusions match the known facts', () => {
    const bySize = new Map<number, number>()
    for (const c of ds.combinations) {
      bySize.set(c.size, (bySize.get(c.size) ?? 0) + 1)
    }
    expect(bySize.get(1)).toBe(10)
    expect(bySize.get(2)).toBe(124)
    expect(bySize.get(3)).toBe(112)
    expect(bySize.get(4)).toBe(99)
    expect(bySize.get(5)).toBe(3)
    expect(ds.combinations.filter((c) => c.excluded)).toHaveLength(10)
  })
  it('keeps known values intact (Hermosa Pink)', () => {
    const hermosa = ds.colors.find((c) => c.slug === 'hermosa-pink')!
    expect(hermosa.id).toBe(1)
    expect(hermosa.hex).toBe('#ffb3f0')
    expect(hermosa.rgb).toEqual([255, 179, 240])
    expect(hermosa.cmyk).toEqual([0, 30, 6, 0])
    expect(hermosa.hue).toBeCloseTo(316.6, 0)
    expect(hermosa.combinationIds).toEqual([176, 227, 273])
  })
  it("keeps Vandar Poel's Blue with zero combinations", () => {
    const v = ds.colors.find((c) => c.name.includes('Vandar'))!
    expect(v.combinationIds).toEqual([])
  })
  it('combination colorIds are ascending', () => {
    for (const c of ds.combinations) {
      expect([...c.colorIds].sort((a, b) => a - b)).toEqual(c.colorIds)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/transform.test.ts`
Expected: FAIL — cannot resolve `../scripts/ingest/transform`.

- [ ] **Step 3: Implement `scripts/ingest/transform.ts`**

```ts
// Transforms the raw source format into the internal Dataset contract.
// Source-format knowledge must not leak past this directory.
import { hueOf } from '../../src/core/colorMath'
import type { CMYK, ColorRecord, CombinationRecord, Dataset, RGB } from '../../src/core/types'
import { SCHEMA_VERSION } from '../../src/core/types'
import type { Curation } from './curation'
import type { RawFile } from './rawTypes'

export function transform(raw: RawFile, curation: Curation, retrievedOn: string): Dataset {
  const colors: ColorRecord[] = raw.colors.map((c) => ({
    id: c.index,
    name: c.name,
    slug: c.slug,
    hex: c.hex.toLowerCase(),
    rgb: c.rgb_array as RGB,
    cmyk: c.cmyk_array as CMYK,
    hue: hueOf(c.hex),
    fineId: curation.assignments[c.slug],
    combinationIds: [...c.combinations],
  }))

  // Combinations are implicit in the source: combination N = every color
  // whose `combinations` array contains N.
  const members = new Map<number, number[]>()
  for (const c of raw.colors) {
    for (const comboId of c.combinations) {
      const list = members.get(comboId) ?? []
      list.push(c.index)
      members.set(comboId, list)
    }
  }
  const combinations: CombinationRecord[] = [...members.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, colorIds]) => {
      const sorted = [...colorIds].sort((a, b) => a - b)
      return { id, colorIds: sorted, size: sorted.length, excluded: sorted.length < 2 }
    })

  return {
    schemaVersion: SCHEMA_VERSION,
    source: { name: 'sanzo-wada.dmbk.io', url: 'https://sanzo-wada.dmbk.io/assets/colors.json', retrievedOn },
    colors,
    combinations,
    groups: {
      fine: curation.fineFamilies.map((f) => ({ id: f.id, name: f.name, parentId: f.broadId })),
      broad: curation.broadFamilies.map((b) => ({ id: b.id, name: b.name, parentId: b.superId })),
      super: curation.superGroups.map((s) => ({ id: s.id, name: s.name, parentId: null })),
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `make test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ingest/transform.ts tests/transform.test.ts
git commit -m "feat: ingest transform from raw source to internal dataset"
```

---

### Task 6: Ingest CLI + processed data + `make update-data`

**Files:**
- Create: `scripts/ingest/ingest.ts`, `data/processed/colors-data.json` (generated)
- Modify: `Makefile` (add `update-data`), `README.md` (data section)

**Interfaces:**
- Consumes: `transform` (Task 5), `curation` (Task 4), `validateDataset` (Task 3).
- Produces: the committed `data/processed/colors-data.json` every later task loads.

- [ ] **Step 1: Write `scripts/ingest/ingest.ts`**

```ts
// CLI: regenerates data/processed/colors-data.json from data/raw/.
// Run via: npm run ingest   (or: make update-data, which re-downloads first)
import { readFileSync, writeFileSync } from 'node:fs'
import { validateDataset } from '../../src/core/validate'
import { curation } from './curation'
import type { RawFile } from './rawTypes'
import { transform } from './transform'

const raw = JSON.parse(readFileSync('data/raw/colors.json', 'utf8')) as RawFile
const retrievedOn = readFileSync('data/raw/retrieved-on.txt', 'utf8').trim()

const dataset = validateDataset(transform(raw, curation, retrievedOn))

writeFileSync('data/processed/colors-data.json', JSON.stringify(dataset, null, 1) + '\n')
console.log(
  `Wrote data/processed/colors-data.json — ${dataset.colors.length} colors, ` +
  `${dataset.combinations.length} combinations, schema v${dataset.schemaVersion}`,
)
```

- [ ] **Step 2: Run it**

```bash
mkdir -p data/processed && npm run ingest
```

Expected output: `Wrote data/processed/colors-data.json — 157 colors, 348 combinations, schema v1`.

- [ ] **Step 3: Add the Makefile target** (after `preview`, before `clean`):

```make
update-data: ## Re-download source data and regenerate data/processed/
	curl -fsSL https://sanzo-wada.dmbk.io/assets/colors.json -o data/raw/colors.json
	date +%F > data/raw/retrieved-on.txt
	$(NPM) run ingest
```

- [ ] **Step 4: Update README.md** — replace the `data/` bullet in "How this project is organized" with:

```markdown
- `data/raw/` — the vendored source data (downloaded from
  sanzo-wada.dmbk.io; the site never fetches it live). `data/processed/` —
  the generated, validated internal format the site actually reads.
  Regenerate any time with `make update-data`. If the source data ever has
  to change (e.g. licensing), only `scripts/ingest/` needs rewriting.
```

and add `| \`make update-data\` | Re-downloads the source colors and regenerates the processed data |` to the commands table.

- [ ] **Step 5: Verify** — `make update-data` runs end-to-end; `git diff data/` shows only harmless churn (retrieved-on date). `make test` passes.

- [ ] **Step 6: Commit**

```bash
git add scripts/ingest data Makefile README.md
git commit -m "feat: ingest CLI, generated processed dataset, make update-data"
```

---

### Task 7: Dataset indexing & queries

**Files:**
- Create: `src/core/dataset.ts`
- Test: `tests/dataset.test.ts`

**Interfaces:**
- Consumes: types (Task 3), fixture `mini` (Task 3).
- Produces (every UI task consumes these):

```ts
export interface Indexed {
  data: Dataset
  colorById: Map<number, ColorRecord>
  comboById: Map<number, CombinationRecord>
  groupById: Map<string, GroupNode>       // fine+broad+super merged
  broadOfFine: Map<string, string>
  superOfBroad: Map<string, string>
  colorsOfFine: Map<string, number[]>     // fineId → color ids
}
export function index(data: Dataset): Indexed
export function displayableCombinations(ix: Indexed): CombinationRecord[]  // !excluded
export function sizeBucket(c: CombinationRecord): SizeBucket               // 2 | 3 | 4 (4 = size >= 4)
export function combinationsForColor(ix: Indexed, colorId: number): CombinationRecord[]  // !excluded, by id asc
export function searchColors(ix: Indexed, query: string): ColorRecord[]    // case-insensitive substring on name; '' → []
export function ancestorAtLevel(ix: Indexed, colorId: number, level: GranularityLevel): string
//   level 0 → `c${colorId}`, 1 → fineId, 2 → broadId, 3 → superId
export function groupMembers(ix: Indexed, groupId: string): ColorRecord[]  // colors under a group at ANY level, hue-sorted
```

- [ ] **Step 1: Write the failing tests** — `tests/dataset.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  ancestorAtLevel, combinationsForColor, displayableCombinations,
  groupMembers, index, searchColors, sizeBucket,
} from '../src/core/dataset'
import { mini } from './fixtures/miniDataset'

const ix = index(mini)

describe('dataset queries', () => {
  it('indexes lookups', () => {
    expect(ix.colorById.get(1)!.name).toBe('Test Pink A')
    expect(ix.comboById.get(12)!.size).toBe(3)
    expect(ix.groupById.get('pink')!.name).toBe('Pink')
  })
  it('displayable excludes the quirk combos', () => {
    expect(displayableCombinations(ix).map((c) => c.id)).toEqual([10, 11, 12, 14])
  })
  it('buckets sizes with 5-color under 4', () => {
    expect(sizeBucket(ix.comboById.get(10)!)).toBe(2)
    expect(sizeBucket(ix.comboById.get(12)!)).toBe(3)
    expect(sizeBucket(ix.comboById.get(14)!)).toBe(4)
  })
  it('lists combinations for a color, excluding quirks', () => {
    expect(combinationsForColor(ix, 3).map((c) => c.id)).toEqual([11, 14])
    expect(combinationsForColor(ix, 6)).toEqual([])
  })
  it('searches names case-insensitively', () => {
    expect(searchColors(ix, 'pink').map((c) => c.id)).toEqual([1, 2])
    expect(searchColors(ix, 'BLUE').map((c) => c.id)).toEqual([4, 5])
    expect(searchColors(ix, '')).toEqual([])
  })
  it('walks ancestors per level', () => {
    expect(ancestorAtLevel(ix, 1, 0)).toBe('c1')
    expect(ancestorAtLevel(ix, 1, 1)).toBe('dusty-pinks')
    expect(ancestorAtLevel(ix, 1, 2)).toBe('pink')
    expect(ancestorAtLevel(ix, 1, 3)).toBe('warm')
  })
  it('collects group members at any level, hue-sorted', () => {
    expect(groupMembers(ix, 'dusty-pinks').map((c) => c.id)).toEqual([2, 1])
    expect(groupMembers(ix, 'cool').map((c) => c.id)).toEqual([6, 5, 4])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/dataset.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/dataset.ts`**

```ts
// Indexing and query helpers over a validated Dataset.
// Core kernel: no imports outside src/core.
import type {
  ColorRecord, CombinationRecord, Dataset, GranularityLevel, GroupNode, SizeBucket,
} from './types'

export interface Indexed {
  data: Dataset
  colorById: Map<number, ColorRecord>
  comboById: Map<number, CombinationRecord>
  groupById: Map<string, GroupNode>
  broadOfFine: Map<string, string>
  superOfBroad: Map<string, string>
  colorsOfFine: Map<string, number[]>
}

export function index(data: Dataset): Indexed {
  const colorById = new Map(data.colors.map((c) => [c.id, c]))
  const comboById = new Map(data.combinations.map((c) => [c.id, c]))
  const groupById = new Map(
    [...data.groups.fine, ...data.groups.broad, ...data.groups.super].map((g) => [g.id, g]),
  )
  const broadOfFine = new Map(data.groups.fine.map((f) => [f.id, f.parentId!]))
  const superOfBroad = new Map(data.groups.broad.map((b) => [b.id, b.parentId!]))
  const colorsOfFine = new Map<string, number[]>()
  for (const c of data.colors) {
    const list = colorsOfFine.get(c.fineId) ?? []
    list.push(c.id)
    colorsOfFine.set(c.fineId, list)
  }
  return { data, colorById, comboById, groupById, broadOfFine, superOfBroad, colorsOfFine }
}

export function displayableCombinations(ix: Indexed): CombinationRecord[] {
  return ix.data.combinations.filter((c) => !c.excluded)
}

export function sizeBucket(c: CombinationRecord): SizeBucket {
  return c.size >= 4 ? 4 : (c.size as SizeBucket)
}

export function combinationsForColor(ix: Indexed, colorId: number): CombinationRecord[] {
  const color = ix.colorById.get(colorId)
  if (!color) return []
  return color.combinationIds
    .map((id) => ix.comboById.get(id)!)
    .filter((c) => !c.excluded)
    .sort((a, b) => a.id - b.id)
}

export function searchColors(ix: Indexed, query: string): ColorRecord[] {
  const q = query.trim().toLowerCase()
  if (q === '') return []
  return ix.data.colors
    .filter((c) => c.name.toLowerCase().includes(q))
    .sort((a, b) => a.id - b.id)
}

export function ancestorAtLevel(ix: Indexed, colorId: number, level: GranularityLevel): string {
  if (level === 0) return `c${colorId}`
  const fineId = ix.colorById.get(colorId)!.fineId
  if (level === 1) return fineId
  const broadId = ix.broadOfFine.get(fineId)!
  if (level === 2) return broadId
  return ix.superOfBroad.get(broadId)!
}

export function groupMembers(ix: Indexed, groupId: string): ColorRecord[] {
  const members = ix.data.colors.filter((c) => {
    const fine = c.fineId
    const broad = ix.broadOfFine.get(fine)!
    const sup = ix.superOfBroad.get(broad)!
    return groupId === fine || groupId === broad || groupId === sup
  })
  return members.sort((a, b) => a.hue - b.hue)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `make test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/dataset.ts tests/dataset.test.ts
git commit -m "feat: dataset indexing and query functions"
```

---

### Task 8: Chord-matrix math

**Files:**
- Create: `src/core/chord.ts`
- Test: `tests/chord.test.ts`

**Interfaces:**
- Consumes: `Indexed`, `ancestorAtLevel`, `displayableCombinations`, `sizeBucket`, `groupMembers` (Task 7); `isNeutral` (Task 2).
- Produces (the wheel consumes these; keys match `ancestorAtLevel` outputs):

```ts
export interface WheelNode {
  key: string          // 'c<id>' at level 0, group id at levels 1–3
  label: string        // color or group name
  swatchHexes: string[] // 1 hex at level 0; member hexes (hue-sorted) for groups
}
export function wheelNodes(ix: Indexed, level: GranularityLevel): WheelNode[]
// level 0: all 157 colors, neutrals last then by hue. levels 1–3: groups in
// their authored array order.
export function chordMatrix(
  ix: Indexed, level: GranularityLevel, sizes: ReadonlySet<SizeBucket>,
): { nodes: WheelNode[]; matrix: number[][] }
// matrix[i][j] = count of displayable, size-filtered combinations with at
// least one color in node i and one in node j. Symmetric. matrix[i][i] =
// combos with ≥2 of their colors inside node i.
export function combosForPair(
  ix: Indexed, level: GranularityLevel, keyA: string, keyB: string,
  sizes: ReadonlySet<SizeBucket>,
): CombinationRecord[]  // combos linking the two nodes, id-ascending
```

- [ ] **Step 1: Write the failing tests** — `tests/chord.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chordMatrix, combosForPair, wheelNodes } from '../src/core/chord'
import { index } from '../src/core/dataset'
import { validateDataset } from '../src/core/validate'
import { mini } from './fixtures/miniDataset'

const ix = index(mini)
const ALL = new Set<2 | 3 | 4>([2, 3, 4])

describe('wheelNodes', () => {
  it('level 0 lists colors, neutrals last', () => {
    const nodes = wheelNodes(ix, 0)
    expect(nodes).toHaveLength(6)
    expect(nodes.at(-1)!.key).toBe('c6') // the gray
    expect(nodes[0].swatchHexes).toHaveLength(1)
  })
  it('levels use authored group order', () => {
    expect(wheelNodes(ix, 2).map((n) => n.key)).toEqual(['pink', 'red', 'blue'])
    expect(wheelNodes(ix, 3).map((n) => n.key)).toEqual(['warm', 'cool'])
  })
  it('group nodes carry member swatches', () => {
    const pink = wheelNodes(ix, 2).find((n) => n.key === 'pink')!
    expect(pink.swatchHexes).toEqual(['#ffb3f0', '#ffa6d9']) // hue-sorted
  })
})

describe('chordMatrix', () => {
  // Fixture displayable combos: 10=[1,4] 11=[2,3] 12=[1,4,5] 14=[1,2,3,4,5]
  it('computes the level-3 matrix by hand-check', () => {
    const { nodes, matrix } = chordMatrix(ix, 3, ALL)
    const warm = nodes.findIndex((n) => n.key === 'warm')
    const cool = nodes.findIndex((n) => n.key === 'cool')
    // warm↔cool: combos 10, 12, 14 → 3. warm self: 11 (pink+red), 14. cool self: 12, 14.
    expect(matrix[warm][cool]).toBe(3)
    expect(matrix[cool][warm]).toBe(3)
    expect(matrix[warm][warm]).toBe(2)
    expect(matrix[cool][cool]).toBe(2)
  })
  it('respects the size filter', () => {
    const { nodes, matrix } = chordMatrix(ix, 3, new Set<2 | 3 | 4>([2]))
    const warm = nodes.findIndex((n) => n.key === 'warm')
    const cool = nodes.findIndex((n) => n.key === 'cool')
    expect(matrix[warm][cool]).toBe(1) // only combo 10
    expect(matrix[warm][warm]).toBe(1) // only combo 11
  })
  it('is symmetric on the full real dataset', () => {
    const real = index(validateDataset(
      JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8')),
    ))
    for (const level of [0, 1, 2, 3] as const) {
      const { matrix } = chordMatrix(real, level, ALL)
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < i; j++) {
          expect(matrix[i][j]).toBe(matrix[j][i])
        }
      }
    }
  })
})

describe('combosForPair', () => {
  it('returns the combos linking two nodes', () => {
    expect(combosForPair(ix, 3, 'warm', 'cool', ALL).map((c) => c.id)).toEqual([10, 12, 14])
    expect(combosForPair(ix, 0, 'c1', 'c4', ALL).map((c) => c.id)).toEqual([10, 12, 14])
    expect(combosForPair(ix, 0, 'c1', 'c3', new Set<2 | 3 | 4>([2]))).toEqual([])
  })
  it('self-pair returns combos internal to the node', () => {
    expect(combosForPair(ix, 3, 'warm', 'warm', ALL).map((c) => c.id)).toEqual([11, 14])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/chord.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/chord.ts`**

```ts
// Chord-diagram math: nodes per granularity level and co-occurrence matrix.
// Core kernel: no imports outside src/core.
import { isNeutral } from './colorMath'
import type { Indexed } from './dataset'
import {
  ancestorAtLevel, displayableCombinations, groupMembers, sizeBucket,
} from './dataset'
import type { CombinationRecord, GranularityLevel, SizeBucket } from './types'

export interface WheelNode {
  key: string
  label: string
  swatchHexes: string[]
}

export function wheelNodes(ix: Indexed, level: GranularityLevel): WheelNode[] {
  if (level === 0) {
    return [...ix.data.colors]
      .sort((a, b) =>
        Number(isNeutral(a.hex)) - Number(isNeutral(b.hex)) || a.hue - b.hue)
      .map((c) => ({ key: `c${c.id}`, label: c.name, swatchHexes: [c.hex] }))
  }
  const groups =
    level === 1 ? ix.data.groups.fine : level === 2 ? ix.data.groups.broad : ix.data.groups.super
  return groups.map((g) => ({
    key: g.id,
    label: g.name,
    swatchHexes: groupMembers(ix, g.id).map((c) => c.hex),
  }))
}

function filteredCombos(ix: Indexed, sizes: ReadonlySet<SizeBucket>): CombinationRecord[] {
  return displayableCombinations(ix).filter((c) => sizes.has(sizeBucket(c)))
}

export function chordMatrix(
  ix: Indexed, level: GranularityLevel, sizes: ReadonlySet<SizeBucket>,
): { nodes: WheelNode[]; matrix: number[][] } {
  const nodes = wheelNodes(ix, level)
  const idx = new Map(nodes.map((n, i) => [n.key, i]))
  const n = nodes.length
  const matrix: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0))

  for (const combo of filteredCombos(ix, sizes)) {
    const positions = new Map<number, number>() // node index → member count
    for (const colorId of combo.colorIds) {
      const i = idx.get(ancestorAtLevel(ix, colorId, level))!
      positions.set(i, (positions.get(i) ?? 0) + 1)
    }
    const keys = [...positions.keys()]
    for (let a = 0; a < keys.length; a++) {
      for (let b = a + 1; b < keys.length; b++) {
        matrix[keys[a]][keys[b]] += 1
        matrix[keys[b]][keys[a]] += 1
      }
    }
    for (const [i, count] of positions) {
      if (count >= 2) matrix[i][i] += 1
    }
  }
  return { nodes, matrix }
}

export function combosForPair(
  ix: Indexed, level: GranularityLevel, keyA: string, keyB: string,
  sizes: ReadonlySet<SizeBucket>,
): CombinationRecord[] {
  return filteredCombos(ix, sizes)
    .filter((combo) => {
      const keys = combo.colorIds.map((id) => ancestorAtLevel(ix, id, level))
      if (keyA === keyB) return keys.filter((k) => k === keyA).length >= 2
      return keys.includes(keyA) && keys.includes(keyB)
    })
    .sort((a, b) => a.id - b.id)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `make test`
Expected: all PASS (the symmetry test uses `data/processed/colors-data.json` from Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/core/chord.ts tests/chord.test.ts
git commit -m "feat: chord matrix math with granularity levels and size filters"
```

---

### Task 9: Export formatters + app-state reducer

**Files:**
- Create: `src/core/export.ts`, `src/core/state.ts`
- Test: `tests/export.test.ts`, `tests/state.test.ts`

**Interfaces:**
- Consumes: `Indexed` (Task 7), types (Task 3).
- Produces:

```ts
// src/core/export.ts
export function cssVariablesFor(ix: Indexed, combo: CombinationRecord): string
export function jsonFor(ix: Indexed, combo: CombinationRecord): string

// src/core/state.ts
export type Selection =
  | { kind: 'color'; id: number }
  | { kind: 'combination'; id: number }
  | { kind: 'group'; id: string }
  | { kind: 'ribbon'; level: GranularityLevel; keyA: string; keyB: string }
export interface AppState {
  view: 'wheel' | 'browse'
  granularity: GranularityLevel
  sizes: SizeBucket[]          // always non-empty, ascending
  selection: Selection | null
  aboutOpen: boolean
}
export type Action =
  | { type: 'setView'; view: AppState['view'] }
  | { type: 'setGranularity'; level: GranularityLevel }
  | { type: 'toggleSize'; size: SizeBucket }
  | { type: 'select'; selection: Selection }
  | { type: 'closePanel' }
  | { type: 'toggleAbout' }
export const initialState: AppState
export function reducer(state: AppState, action: Action): AppState
```

- [ ] **Step 1: Write the failing tests**

`tests/export.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { index } from '../src/core/dataset'
import { cssVariablesFor, jsonFor } from '../src/core/export'
import { mini } from './fixtures/miniDataset'

const ix = index(mini)
const combo = ix.comboById.get(10)! // Test Pink A + Test Blue A

describe('export formatters', () => {
  it('formats CSS custom properties', () => {
    expect(cssVariablesFor(ix, combo)).toBe(
      `/* Sanzo Wada combination 10 — Test Pink A, Test Blue A */\n` +
      `:root {\n  --test-pink-a: #ffa6d9;\n  --test-blue-a: #236192;\n}\n`,
    )
  })
  it('formats JSON with names and codes', () => {
    const parsed = JSON.parse(jsonFor(ix, combo))
    expect(parsed.combination).toBe(10)
    expect(parsed.colors).toEqual([
      { name: 'Test Pink A', slug: 'test-pink-a', hex: '#ffa6d9', rgb: [255, 166, 217], cmyk: [0, 35, 15, 0] },
      { name: 'Test Blue A', slug: 'test-blue-a', hex: '#236192', rgb: [35, 97, 146], cmyk: [76, 34, 0, 43] },
    ])
  })
})
```

`tests/state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../src/core/state'

describe('app state reducer', () => {
  it('starts on the wheel at color granularity with all sizes on', () => {
    expect(initialState).toEqual({
      view: 'wheel', granularity: 0, sizes: [2, 3, 4], selection: null, aboutOpen: false,
    })
  })
  it('switches views', () => {
    expect(reducer(initialState, { type: 'setView', view: 'browse' }).view).toBe('browse')
  })
  it('sets granularity', () => {
    expect(reducer(initialState, { type: 'setGranularity', level: 2 }).granularity).toBe(2)
  })
  it('toggles sizes but never allows an empty set', () => {
    let s = reducer(initialState, { type: 'toggleSize', size: 3 })
    expect(s.sizes).toEqual([2, 4])
    s = reducer(s, { type: 'toggleSize', size: 2 })
    s = reducer(s, { type: 'toggleSize', size: 4 })
    expect(s.sizes).toEqual([4]) // last one refuses to toggle off
    s = reducer(s, { type: 'toggleSize', size: 3 })
    expect(s.sizes).toEqual([3, 4]) // kept ascending
  })
  it('selects and closes', () => {
    const s = reducer(initialState, { type: 'select', selection: { kind: 'color', id: 1 } })
    expect(s.selection).toEqual({ kind: 'color', id: 1 })
    expect(reducer(s, { type: 'closePanel' }).selection).toBeNull()
  })
  it('about toggles and state stays serializable', () => {
    const s = reducer(initialState, { type: 'toggleAbout' })
    expect(s.aboutOpen).toBe(true)
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/export.test.ts tests/state.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/core/export.ts`:

```ts
// Formats a combination for use outside the site (CSS, JSON).
// Core kernel: no imports outside src/core.
import type { Indexed } from './dataset'
import type { CombinationRecord } from './types'

export function cssVariablesFor(ix: Indexed, combo: CombinationRecord): string {
  const colors = combo.colorIds.map((id) => ix.colorById.get(id)!)
  const names = colors.map((c) => c.name).join(', ')
  const lines = colors.map((c) => `  --${c.slug}: ${c.hex};`).join('\n')
  return `/* Sanzo Wada combination ${combo.id} — ${names} */\n:root {\n${lines}\n}\n`
}

export function jsonFor(ix: Indexed, combo: CombinationRecord): string {
  const colors = combo.colorIds.map((id) => {
    const c = ix.colorById.get(id)!
    return { name: c.name, slug: c.slug, hex: c.hex, rgb: c.rgb, cmyk: c.cmyk }
  })
  return JSON.stringify(
    { combination: combo.id, source: 'A Dictionary of Color Combinations — Sanzo Wada', colors },
    null, 2,
  )
}
```

`src/core/state.ts`:

```ts
// The single serializable app-state object and its reducer.
// Core kernel: no imports outside src/core.
import type { GranularityLevel, SizeBucket } from './types'

export type Selection =
  | { kind: 'color'; id: number }
  | { kind: 'combination'; id: number }
  | { kind: 'group'; id: string }
  | { kind: 'ribbon'; level: GranularityLevel; keyA: string; keyB: string }

export interface AppState {
  view: 'wheel' | 'browse'
  granularity: GranularityLevel
  sizes: SizeBucket[]
  selection: Selection | null
  aboutOpen: boolean
}

export type Action =
  | { type: 'setView'; view: AppState['view'] }
  | { type: 'setGranularity'; level: GranularityLevel }
  | { type: 'toggleSize'; size: SizeBucket }
  | { type: 'select'; selection: Selection }
  | { type: 'closePanel' }
  | { type: 'toggleAbout' }

export const initialState: AppState = {
  view: 'wheel',
  granularity: 0,
  sizes: [2, 3, 4],
  selection: null,
  aboutOpen: false,
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setView':
      return { ...state, view: action.view }
    case 'setGranularity':
      return { ...state, granularity: action.level }
    case 'toggleSize': {
      const has = state.sizes.includes(action.size)
      if (has && state.sizes.length === 1) return state
      const sizes = has
        ? state.sizes.filter((s) => s !== action.size)
        : [...state.sizes, action.size].sort((a, b) => a - b)
      return { ...state, sizes }
    }
    case 'select':
      return { ...state, selection: action.selection, aboutOpen: false }
    case 'closePanel':
      return { ...state, selection: null }
    case 'toggleAbout':
      return { ...state, aboutOpen: !state.aboutOpen, selection: null }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `make test`
Expected: all PASS. The core kernel is now complete.

- [ ] **Step 5: Commit**

```bash
git add src/core tests
git commit -m "feat: export formatters and serializable app-state reducer"
```

### Task 10: App shell — tokens, fonts, data wiring, header, layout

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/fonts.css`, `src/styles/app.css`, `src/assets/fonts/*.woff2`, `src/data.ts`, `src/App.tsx`, `src/components/Header.tsx`
- Modify: `src/main.tsx`
- Test: `tests/appSmoke.test.tsx`

**Interfaces:**
- Consumes: `validateDataset`, `index`, `initialState`, `reducer` from core.
- Produces: `dataset: Indexed` (from `src/data.ts`); `App` renders `Header` + a `<main>` that shows `wheel`/`browse` placeholders; `Header` props: `{ state: AppState; dispatch: (a: Action) => void }`. Every later UI task mounts inside this shell and receives `{ ix, state, dispatch }` props.

- [ ] **Step 1: Fonts.** Download self-hosted woff2 (Google Webfonts Helper mirrors Google Fonts with direct woff2 files):

```bash
mkdir -p src/assets/fonts
BASE=https://gwfh.mranftl.com/api/fonts
curl -fsSL "$BASE/eb-garamond?download=zip&subsets=latin&variants=regular,500,italic&formats=woff2" -o /tmp/ebg.zip
curl -fsSL "$BASE/atkinson-hyperlegible?download=zip&subsets=latin&variants=regular,italic,700&formats=woff2" -o /tmp/ah.zip
curl -fsSL "$BASE/atkinson-hyperlegible-mono?download=zip&subsets=latin&variants=regular,700&formats=woff2" -o /tmp/ahm.zip
unzip -o /tmp/ebg.zip -d src/assets/fonts && unzip -o /tmp/ah.zip -d src/assets/fonts && unzip -o /tmp/ahm.zip -d src/assets/fonts
ls src/assets/fonts
```

If any download fails (API gone, font missing): proceed with the fallback stacks already in tokens.css, skip fonts.css for that family, and add a TODO.md item "self-host <family>" — do NOT add a runtime CDN link.

`src/styles/fonts.css` — one `@font-face` per downloaded file, exact filenames from `ls`, pattern:

```css
@font-face {
  font-family: 'EB Garamond';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fonts/eb-garamond-v27-latin-regular.woff2') format('woff2');
}
/* ...repeat for each file: EB Garamond 500/italic; Atkinson Hyperlegible
   400/400italic/700; Atkinson Hyperlegible Mono 400/700 */
```

- [ ] **Step 2: Write `src/styles/tokens.css`** — every design token; components may reference ONLY these variables (Sanzo Wada data colors excepted):

```css
/* Design tokens — the ONLY place style values live. Spec: Washi & Ink +
   owner's brand (see docs/superpowers/specs/, mockup HTML files). */
:root {
  /* ground */
  --paper-1: #f8f6f2;
  --paper-2: #f0ebe2;
  /* ink */
  --ink: #2f2a26;
  --ink-muted: #7e7468;
  --ink-faint: #b8aea2;
  --hairline: #e8ddd2;
  /* brand accents — orange ONLY for seal/active-nav/slider-stop/hover */
  --accent: #f26522;
  --link: #236192;
  /* type */
  --font-display: 'EB Garamond', 'Iowan Old Style', Palatino, Georgia, serif;
  --font-ui: 'Atkinson Hyperlegible', system-ui, -apple-system, sans-serif;
  --font-mono: 'Atkinson Hyperlegible Mono', ui-monospace, 'SF Mono', monospace;
  --tracking-wide: 0.2em;
  --tracking-label: 0.14em;
  /* space (4px scale) */
  --s1: 0.25rem; --s2: 0.5rem; --s3: 0.75rem; --s4: 1rem;
  --s6: 1.5rem; --s8: 2rem; --s12: 3rem;
  /* layout */
  --panel-width: 400px;
  --radius: 3px;
  --header-height: 64px;
  /* motion */
  --dur-fast: 200ms;
  --dur: 500ms;
  --ease: cubic-bezier(0.25, 0.1, 0.25, 1);
}
```

- [ ] **Step 3: Write `src/styles/app.css`** — base + layout (component-specific rules accrete here in later tasks; keep sections commented by component name):

```css
@import './fonts.css';
@import './tokens.css';

* { box-sizing: border-box; margin: 0; }

html, body, #root { height: 100%; }

body {
  background: linear-gradient(160deg, var(--paper-1), var(--paper-2)) fixed;
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 16px;
  line-height: 1.6;
}

a { color: var(--link); }
button { font-family: var(--font-ui); cursor: pointer; }

.app { display: flex; flex-direction: column; height: 100%; }
main { flex: 1; min-height: 0; position: relative; }

/* Header */
.header {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--s6); padding: var(--s4) var(--s8);
  border-bottom: 1px solid var(--hairline);
}
.wordmark { font-family: var(--font-display); font-size: 1.4rem; letter-spacing: 0.12em; }
.wordmark .seal { color: var(--accent); }
.wordmark small {
  color: var(--ink-faint); font-family: var(--font-ui); font-size: 0.65rem;
  letter-spacing: var(--tracking-wide); margin-left: var(--s2); text-transform: uppercase;
}
.nav { display: flex; align-items: center; gap: var(--s4); }
.nav button {
  background: none; border: none; color: var(--ink-muted); font-size: 0.85rem;
  letter-spacing: var(--tracking-label); padding: var(--s1) 0;
  border-bottom: 2px solid transparent;
}
.nav button:hover { color: var(--ink); }
.nav button[aria-pressed='true'] { color: var(--ink); border-bottom-color: var(--accent); }
.nav .surprise {
  border: 1px solid var(--ink-faint); border-radius: var(--radius);
  padding: var(--s1) var(--s3);
}
.nav .surprise:hover { border-color: var(--accent); color: var(--ink); }
```

- [ ] **Step 4: Write `src/data.ts`**

```ts
// Loads the bundled processed dataset. The ONLY module that touches the
// data file; everything else goes through core queries on `dataset`.
import processed from '../data/processed/colors-data.json'
import { index, type Indexed } from './core/dataset'
import { validateDataset } from './core/validate'

export const dataset: Indexed = index(validateDataset(processed))
```

- [ ] **Step 5: Write `src/components/Header.tsx`**

```tsx
import type { Action, AppState } from '../core/state'
import { dataset } from '../data'
import { displayableCombinations } from '../core/dataset'

interface Props { state: AppState; dispatch: (a: Action) => void }

export function Header({ state, dispatch }: Props) {
  function surprise() {
    const combos = displayableCombinations(dataset)
    const pick = combos[Math.floor(Math.random() * combos.length)]
    dispatch({ type: 'select', selection: { kind: 'combination', id: pick.id } })
  }
  return (
    <header className="header">
      <div className="wordmark">
        Iro <span className="seal">色</span>
        <small>A Dictionary of Color Combinations</small>
      </div>
      <nav className="nav">
        <button aria-pressed={state.view === 'wheel'} onClick={() => dispatch({ type: 'setView', view: 'wheel' })}>Wheel</button>
        <button aria-pressed={state.view === 'browse'} onClick={() => dispatch({ type: 'setView', view: 'browse' })}>Browse</button>
        <button aria-pressed={state.aboutOpen} onClick={() => dispatch({ type: 'toggleAbout' })}>About</button>
        <button className="surprise" onClick={surprise}>Surprise me</button>
      </nav>
    </header>
  )
}
```

(SearchBox slots into this nav in Task 15.)

- [ ] **Step 6: Write `src/App.tsx` and update `src/main.tsx`**

`src/App.tsx`:

```tsx
import { useReducer } from 'react'
import { Header } from './components/Header'
import { initialState, reducer } from './core/state'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <div className="app">
      <Header state={state} dispatch={dispatch} />
      <main>
        {state.view === 'wheel' ? <p style={{ padding: '2rem' }}>wheel goes here</p> : <p style={{ padding: '2rem' }}>browse goes here</p>}
      </main>
    </div>
  )
}
```

`src/main.tsx`:

```tsx
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 7: Write the smoke test** — `tests/appSmoke.test.tsx` (renderToString needs no browser; CSS imports need stubbing is NOT required because Vitest with Vite processes them — if it errors, add `css: false` is not a thing; instead the vite pipeline handles `.css` imports natively):

```tsx
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('app shell', () => {
  it('renders header, nav and data-driven shell without crashing', () => {
    const html = renderToString(<App />)
    expect(html).toContain('Iro')
    expect(html).toContain('Browse')
    expect(html).toContain('Surprise me')
  })
})
```

- [ ] **Step 8: Run tests + look at it**

Run: `make test` → all PASS (smoke test also proves the real dataset validates at load).
Run: `make dev`, open the URL: paper gradient, header with wordmark (Garamond), orange 色, nav with orange underline on "Wheel". Stop server.

- [ ] **Step 9: Commit**

```bash
git add src tests index.html
git commit -m "feat: app shell with design tokens, self-hosted fonts, validated data load"
```

---

### Task 11: The Wheel — static chord render + controls

**Files:**
- Create: `src/viz/chordRender.ts`, `src/components/ChordWheel.tsx`, `src/components/WheelControls.tsx`
- Modify: `src/App.tsx` (mount wheel), `src/styles/app.css` (wheel styles)

**Interfaces:**
- Consumes: `chordMatrix`, `WheelNode` (Task 8), state/dispatch (Task 10).
- Produces:

```ts
// src/viz/chordRender.ts — ALL D3 code lives here.
export interface ChordCallbacks {
  onArcClick(key: string): void
  onRibbonClick(keyA: string, keyB: string): void
}
export function renderChord(
  svgEl: SVGSVGElement,
  nodes: WheelNode[],
  matrix: number[][],
  cb: ChordCallbacks,
): void
// Idempotent: clears and redraws with a crossfade. Hover behavior is
// handled internally with D3 (dimming + center label), clicks call cb.
```

```tsx
// src/components/ChordWheel.tsx
export function ChordWheel(props: { state: AppState; dispatch: (a: Action) => void }): JSX.Element
// src/components/WheelControls.tsx
export function WheelControls(props: { state: AppState; dispatch: (a: Action) => void }): JSX.Element
```

- [ ] **Step 1: Implement `src/viz/chordRender.ts`**

```ts
// The chord diagram. ALL D3 usage is quarantined in this file.
import * as d3 from 'd3'
import type { WheelNode } from '../core/chord'

export interface ChordCallbacks {
  onArcClick(key: string): void
  onRibbonClick(keyA: string, keyB: string): void
}

const SIZE = 840
const OUTER = SIZE / 2 - 60
const INNER = OUTER - 24

export function renderChord(
  svgEl: SVGSVGElement, nodes: WheelNode[], matrix: number[][], cb: ChordCallbacks,
): void {
  const svg = d3.select(svgEl)
    .attr('viewBox', `${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`)

  svg.selectAll('g.wheel').transition().duration(200).style('opacity', 0).remove()

  const layout = d3.chord()
    .padAngle(nodes.length > 40 ? 0.004 : 0.02)
    .sortSubgroups(d3.descending)(matrix)

  const g = svg.append('g').attr('class', 'wheel').style('opacity', 0)
  g.transition().duration(300).style('opacity', 1)

  const arcGen = d3.arc<d3.ChordGroup>().innerRadius(INNER).outerRadius(OUTER)
  const ribbonGen = d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(INNER - 2)

  const centerLabel = g.append('text')
    .attr('class', 'wheel-center-label')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')

  function nodeColor(i: number): string {
    const hexes = nodes[i].swatchHexes
    return hexes[Math.floor(hexes.length / 2)]
  }

  // Ribbons first (under the arcs).
  const ribbons = g.append('g').selectAll('path')
    .data(layout)
    .join('path')
    .attr('class', 'ribbon')
    .attr('d', ribbonGen as never)
    .attr('fill', (d) => nodeColor(d.source.index))
    .attr('data-a', (d) => nodes[d.source.index].key)
    .attr('data-b', (d) => nodes[d.target.index].key)
    .on('click', (_e, d) => cb.onRibbonClick(nodes[d.source.index].key, nodes[d.target.index].key))
    .on('mouseenter', function (_e, d) {
      ribbons.classed('dimmed', (r) => r !== d)
      arcs.classed('dimmed', (_a, i) => i !== d.source.index && i !== d.target.index)
      centerLabel.text(`${nodes[d.source.index].label} × ${nodes[d.target.index].label}`)
    })
    .on('mouseleave', clearHover)

  // Arcs: one group per node; group nodes render member-colored segments.
  const arcGroups = g.append('g').selectAll('g.arc')
    .data(layout.groups)
    .join('g')
    .attr('class', 'arc')
    .on('click', (_e, d) => cb.onArcClick(nodes[d.index].key))
    .on('mouseenter', function (_e, d) {
      const key = nodes[d.index].key
      ribbons.classed('dimmed', (r) =>
        nodes[r.source.index].key !== key && nodes[r.target.index].key !== key)
      arcs.classed('dimmed', (_a, i) => i !== d.index)
      centerLabel.text(nodes[d.index].label)
    })
    .on('mouseleave', clearHover)

  const arcs = arcGroups.each(function (d) {
    const hexes = nodes[d.index].swatchHexes
    const step = (d.endAngle - d.startAngle) / hexes.length
    d3.select(this).selectAll('path')
      .data(hexes.map((hex, k) => ({
        hex,
        startAngle: d.startAngle + k * step,
        endAngle: d.startAngle + (k + 1) * step,
      })))
      .join('path')
      .attr('d', (seg) => arcGen(seg as never))
      .attr('fill', (seg) => seg.hex)
  })

  // Labels for group levels only (few arcs); color level names show in center.
  if (nodes.length <= 24) {
    arcGroups.append('text')
      .attr('class', 'arc-label')
      .attr('transform', (d) => {
        const angle = (d.startAngle + d.endAngle) / 2
        const r = OUTER + 14
        const deg = (angle * 180) / Math.PI - 90
        const flip = angle > Math.PI ? 'rotate(180)' : ''
        return `rotate(${deg}) translate(${r},0) ${flip}`
      })
      .attr('text-anchor', (d) => ((d.startAngle + d.endAngle) / 2 > Math.PI ? 'end' : 'start'))
      .attr('dy', '0.35em')
      .text((d) => nodes[d.index].label)
  }

  function clearHover() {
    ribbons.classed('dimmed', false)
    arcs.classed('dimmed', false)
    centerLabel.text('')
  }
}
```

- [ ] **Step 2: Implement `src/components/ChordWheel.tsx`**

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { chordMatrix } from '../core/chord'
import type { Action, AppState } from '../core/state'
import { dataset } from '../data'
import { renderChord } from '../viz/chordRender'

interface Props { state: AppState; dispatch: (a: Action) => void }

export function ChordWheel({ state, dispatch }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const sizes = useMemo(() => new Set(state.sizes), [state.sizes])
  const { granularity } = state

  useEffect(() => {
    if (!svgRef.current) return
    const { nodes, matrix } = chordMatrix(dataset, granularity, sizes)
    renderChord(svgRef.current, nodes, matrix, {
      onArcClick: (key) =>
        dispatch({
          type: 'select',
          selection: granularity === 0
            ? { kind: 'color', id: Number(key.slice(1)) }
            : { kind: 'group', id: key },
        }),
      onRibbonClick: (keyA, keyB) =>
        dispatch({ type: 'select', selection: { kind: 'ribbon', level: granularity, keyA, keyB } }),
    })
  }, [granularity, sizes, dispatch])

  return <svg ref={svgRef} className="chord-wheel" role="img"
    aria-label="Chord diagram of Sanzo Wada's color combinations. Use the Browse view for a list alternative." />
}
```

(Key disambiguation: `ancestorAtLevel` emits `c<id>` keys only at granularity 0, so the level — not the key prefix — decides color vs group.)

- [ ] **Step 3: Implement `src/components/WheelControls.tsx`**

```tsx
import type { Action, AppState } from '../core/state'
import type { GranularityLevel, SizeBucket } from '../core/types'

const LEVELS: { level: GranularityLevel; label: string }[] = [
  { level: 0, label: 'Colors' },
  { level: 1, label: 'Shades' },
  { level: 2, label: 'Families' },
  { level: 3, label: 'Groups' },
]
const SIZES: SizeBucket[] = [2, 3, 4]

interface Props { state: AppState; dispatch: (a: Action) => void }

export function WheelControls({ state, dispatch }: Props) {
  return (
    <div className="wheel-controls">
      <div className="granularity" role="radiogroup" aria-label="Grouping granularity">
        {LEVELS.map(({ level, label }) => (
          <button key={level} role="radio" aria-checked={state.granularity === level}
            onClick={() => dispatch({ type: 'setGranularity', level })}>
            {label}
          </button>
        ))}
      </div>
      <p className="hint">
        Nothing has to match exactly — zoom out to see what pairs with, say, blues in general.
      </p>
      <div className="size-filter" aria-label="Colors per combination">
        {SIZES.map((s) => (
          <button key={s} aria-pressed={state.sizes.includes(s)}
            onClick={() => dispatch({ type: 'toggleSize', size: s })}>
            {s === 4 ? '4+' : s}
          </button>
        ))}
        <span className="size-label">colors per combo</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Mount in `src/App.tsx`** — replace the wheel placeholder:

```tsx
{state.view === 'wheel' ? (
  <div className="wheel-view">
    <ChordWheel state={state} dispatch={dispatch} />
    <WheelControls state={state} dispatch={dispatch} />
  </div>
) : (
  <p style={{ padding: '2rem' }}>browse goes here</p>
)}
```

with imports `import { ChordWheel } from './components/ChordWheel'` and `import { WheelControls } from './components/WheelControls'`.

- [ ] **Step 5: Add wheel styles to `src/styles/app.css`**

```css
/* Wheel */
.wheel-view { height: 100%; display: flex; flex-direction: column; align-items: center; }
.chord-wheel {
  flex: 1; min-height: 0; width: 100%; max-width: 78vh;
  transform: rotate(-4deg); /* wabi-sabi: gently off-axis */
}
.chord-wheel .ribbon { opacity: 0.55; mix-blend-mode: multiply; transition: opacity var(--dur-fast) var(--ease); cursor: pointer; }
.chord-wheel .ribbon:hover { opacity: 0.85; }
.chord-wheel .ribbon.dimmed { opacity: 0.08; }
.chord-wheel .arc { cursor: pointer; transition: opacity var(--dur-fast) var(--ease); }
.chord-wheel .arc.dimmed { opacity: 0.25; }
.chord-wheel .arc-label {
  font-family: var(--font-ui); font-size: 12px; letter-spacing: var(--tracking-label);
  fill: var(--ink-muted); text-transform: uppercase;
}
.chord-wheel .wheel-center-label {
  font-family: var(--font-display); font-size: 26px; fill: var(--ink);
}
.wheel-controls { padding: var(--s4) var(--s8) var(--s6); text-align: center; }
.granularity { display: inline-flex; gap: var(--s2); }
.granularity button {
  background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--ink-muted); font-size: 0.8rem; letter-spacing: var(--tracking-label);
  text-transform: uppercase; padding: var(--s1) var(--s2);
}
.granularity button[aria-checked='true'] { color: var(--ink); border-bottom-color: var(--accent); }
.hint { color: var(--ink-faint); font-size: 0.75rem; font-style: italic; margin: var(--s2) 0; }
.size-filter { display: inline-flex; gap: var(--s2); align-items: center; }
.size-filter button {
  width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--ink-faint);
  background: none; color: var(--ink-faint); font-weight: 700;
}
.size-filter button[aria-pressed='true'] { background: var(--ink); border-color: var(--ink); color: var(--paper-1); }
.size-filter .size-label { color: var(--ink-muted); font-size: 0.7rem; letter-spacing: var(--tracking-label); text-transform: uppercase; }
```

- [ ] **Step 6: Verify in browser** — `make dev`, then check ALL of:
1. Wheel renders: 157 thin arcs in hue order (neutrals clustered at one end), ribbons between them.
2. Hovering an arc dims everything unrelated; the color's name appears in Garamond at the center.
3. Hovering a ribbon shows "Name × Name" in the center.
4. Clicking each granularity button re-renders with a crossfade: Shades ~20 arcs, Families 10, Groups 4 — group arcs show member-color segments and outside labels.
5. Size chips toggle ribbons live; the last active chip refuses to turn off.
6. `make test` still passes; `make build` passes.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: chord wheel with granularity levels, size filters, hover highlighting"
```

---

### Task 12: Plates, copy utility, and detail panels

**Files:**
- Create: `src/components/PlateCard.tsx`, `src/components/CopyField.tsx`, `src/copy.ts`, `src/components/Panel.tsx`, `src/components/ColorDetail.tsx`, `src/components/CombinationDetail.tsx`, `src/components/GroupDetail.tsx`, `src/components/RibbonDetail.tsx`
- Modify: `src/App.tsx` (render panel per selection), `src/styles/app.css`
- Test: `tests/appSmoke.test.tsx` (extend)

**Interfaces:**
- Consumes: core queries (Task 7), `combosForPair` (Task 8), exports (Task 9), `Selection` (Task 9).
- Produces:

```tsx
export function PlateCard(props: { comboId: number; onSelect?: (comboId: number) => void; large?: boolean }): JSX.Element
export function CopyField(props: { label: string; value: string }): JSX.Element
// src/copy.ts
export async function copyText(text: string): Promise<boolean>
export function Panel(props: { title: string; onClose: () => void; children: ReactNode }): JSX.Element
// Detail components each take { state? selection-specific id(s), dispatch }
```

- [ ] **Step 1: `src/copy.ts`**

```ts
// Clipboard with a fallback for older browsers/file: contexts.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}
```

- [ ] **Step 2: `src/components/CopyField.tsx`**

```tsx
import { useState } from 'react'
import { copyText } from '../copy'

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    if (await copyText(value)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <div className="copy-field">
      <span className="copy-label">{label}</span>
      <code>{value}</code>
      <button onClick={onCopy} aria-label={`Copy ${label}`}>{copied ? 'copied ✓' : 'copy'}</button>
    </div>
  )
}
```

- [ ] **Step 3: `src/components/PlateCard.tsx`** — the combination plate used everywhere. Heights use a gentle decorative taper (the data has no true proportions — documented honestly in About):

```tsx
import { readableTextOn } from '../core/colorMath'
import type { Action } from '../core/state'
import { dataset } from '../data'

const TAPER = [1.5, 1.15, 0.9, 0.75, 0.7] // decorative, not from the book

export function PlateCard({ comboId, dispatch, large = false }:
  { comboId: number; dispatch?: (a: Action) => void; large?: boolean }) {
  const combo = dataset.comboById.get(comboId)!
  const colors = combo.colorIds.map((id) => dataset.colorById.get(id)!)
  const total = TAPER.slice(0, colors.length).reduce((a, b) => a + b, 0)
  const inner = (
    <figure className={large ? 'plate plate-large' : 'plate'}>
      <div className="plate-bars">
        {colors.map((c, i) => (
          <div key={c.id} style={{ background: c.hex, flexGrow: TAPER[i] / total }}
            className={`plate-bar text-${readableTextOn(c.hex)}`} title={c.name} />
        ))}
      </div>
      <figcaption>
        <span className="plate-number">No. {combo.id}</span>
        <span className="plate-names">{colors.map((c) => c.name).join(' · ')}</span>
      </figcaption>
    </figure>
  )
  if (!dispatch) return inner
  return (
    <button className="plate-button"
      onClick={() => dispatch({ type: 'select', selection: { kind: 'combination', id: comboId } })}>
      {inner}
    </button>
  )
}
```

- [ ] **Step 4: `src/components/Panel.tsx`**

```tsx
import { useEffect, type ReactNode } from 'react'

export function Panel({ title, onClose, children }:
  { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <aside className="panel" aria-label={title}>
      <div className="panel-head">
        <h2>{title}</h2>
        <button className="panel-close" onClick={onClose} aria-label="Close panel">×</button>
      </div>
      <div className="panel-body">{children}</div>
    </aside>
  )
}
```

- [ ] **Step 5: Detail components**

`src/components/ColorDetail.tsx`:

```tsx
import { combinationsForColor } from '../core/dataset'
import type { Action } from '../core/state'
import { CopyField } from './CopyField'
import { Panel } from './Panel'
import { PlateCard } from './PlateCard'
import { dataset } from '../data'

export function ColorDetail({ colorId, dispatch }: { colorId: number; dispatch: (a: Action) => void }) {
  const c = dataset.colorById.get(colorId)!
  const fine = dataset.groupById.get(c.fineId)!
  const broad = dataset.groupById.get(fine.parentId!)!
  const sup = dataset.groupById.get(broad.parentId!)!
  const combos = combinationsForColor(dataset, colorId)
  return (
    <Panel title={c.name} onClose={() => dispatch({ type: 'closePanel' })}>
      <div className="swatch-hero" style={{ background: c.hex }} />
      <p className="family-chain">
        {fine.name} · <button className="linklike" onClick={() => dispatch({ type: 'select', selection: { kind: 'group', id: broad.id } })}>{broad.name}</button> · {sup.name}
      </p>
      <CopyField label="HEX" value={c.hex} />
      <CopyField label="RGB" value={c.rgb.join(', ')} />
      <CopyField label="CMYK" value={c.cmyk.join(', ')} />
      {combos.length === 0
        ? <p className="empty-note">Appears in no combinations in the book — a wallflower.</p>
        : <>
            <h3>In {combos.length} combination{combos.length > 1 ? 's' : ''}</h3>
            <div className="plate-list">
              {combos.map((combo) => <PlateCard key={combo.id} comboId={combo.id} dispatch={dispatch} />)}
            </div>
          </>}
    </Panel>
  )
}
```

`src/components/CombinationDetail.tsx`:

```tsx
import { cssVariablesFor, jsonFor } from '../core/export'
import type { Action } from '../core/state'
import { copyText } from '../copy'
import { CopyField } from './CopyField'
import { Panel } from './Panel'
import { PlateCard } from './PlateCard'
import { dataset } from '../data'
import { useState } from 'react'

export function CombinationDetail({ comboId, dispatch }: { comboId: number; dispatch: (a: Action) => void }) {
  const combo = dataset.comboById.get(comboId)!
  const colors = combo.colorIds.map((id) => dataset.colorById.get(id)!)
  const [copiedWhat, setCopiedWhat] = useState<string | null>(null)
  async function copyAs(label: string, text: string) {
    if (await copyText(text)) {
      setCopiedWhat(label)
      setTimeout(() => setCopiedWhat(null), 1500)
    }
  }
  return (
    <Panel title={`Combination ${combo.id}`} onClose={() => dispatch({ type: 'closePanel' })}>
      <PlateCard comboId={comboId} large />
      {colors.map((c) => (
        <div key={c.id} className="combo-color-row">
          <button className="linklike"
            onClick={() => dispatch({ type: 'select', selection: { kind: 'color', id: c.id } })}>
            {c.name}
          </button>
          <CopyField label="HEX" value={c.hex} />
        </div>
      ))}
      <div className="export-row">
        <button onClick={() => copyAs('css', cssVariablesFor(dataset, combo))}>
          {copiedWhat === 'css' ? 'copied ✓' : 'Copy CSS variables'}
        </button>
        <button onClick={() => copyAs('json', jsonFor(dataset, combo))}>
          {copiedWhat === 'json' ? 'copied ✓' : 'Copy JSON'}
        </button>
      </div>
    </Panel>
  )
}
```

(The PNG download button joins this export row in Task 15.)

`src/components/GroupDetail.tsx`:

```tsx
import { groupMembers } from '../core/dataset'
import type { Action } from '../core/state'
import { Panel } from './Panel'
import { dataset } from '../data'

export function GroupDetail({ groupId, dispatch }: { groupId: string; dispatch: (a: Action) => void }) {
  const g = dataset.groupById.get(groupId)!
  const members = groupMembers(dataset, groupId)
  return (
    <Panel title={g.name} onClose={() => dispatch({ type: 'closePanel' })}>
      <p className="muted">{members.length} colors</p>
      <div className="swatch-grid">
        {members.map((c) => (
          <button key={c.id} className="swatch-cell" style={{ background: c.hex }} title={c.name}
            onClick={() => dispatch({ type: 'select', selection: { kind: 'color', id: c.id } })} />
        ))}
      </div>
    </Panel>
  )
}
```

`src/components/RibbonDetail.tsx`:

```tsx
import { combosForPair, wheelNodes } from '../core/chord'
import type { Action, Selection } from '../core/state'
import { Panel } from './Panel'
import { PlateCard } from './PlateCard'
import { dataset } from '../data'

export function RibbonDetail({ sel, sizes, dispatch }:
  { sel: Extract<Selection, { kind: 'ribbon' }>; sizes: Set<2 | 3 | 4>; dispatch: (a: Action) => void }) {
  const nodes = wheelNodes(dataset, sel.level)
  const labelOf = (key: string) => nodes.find((n) => n.key === key)?.label ?? key
  const combos = combosForPair(dataset, sel.level, sel.keyA, sel.keyB, sizes)
  const title = sel.keyA === sel.keyB
    ? `Within ${labelOf(sel.keyA)}`
    : `${labelOf(sel.keyA)} × ${labelOf(sel.keyB)}`
  return (
    <Panel title={title} onClose={() => dispatch({ type: 'closePanel' })}>
      <p className="muted">{combos.length} combination{combos.length === 1 ? '' : 's'} in the book</p>
      <div className="plate-list">
        {combos.map((c) => <PlateCard key={c.id} comboId={c.id} dispatch={dispatch} />)}
      </div>
    </Panel>
  )
}
```

- [ ] **Step 6: Wire selection → panel in `src/App.tsx`** — after `<main>`'s view content, render:

```tsx
{state.selection?.kind === 'color' && <ColorDetail colorId={state.selection.id} dispatch={dispatch} />}
{state.selection?.kind === 'combination' && <CombinationDetail comboId={state.selection.id} dispatch={dispatch} />}
{state.selection?.kind === 'group' && <GroupDetail groupId={state.selection.id} dispatch={dispatch} />}
{state.selection?.kind === 'ribbon' && (
  <RibbonDetail sel={state.selection} sizes={new Set(state.sizes)} dispatch={dispatch} />
)}
```

- [ ] **Step 7: Panel & plate styles** — append to `src/styles/app.css`:

```css
/* Panels */
.panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: var(--panel-width);
  max-width: 92vw; background: var(--paper-1); border-left: 1px solid var(--hairline);
  box-shadow: -12px 0 40px rgb(47 42 38 / 0.08); z-index: 10;
  display: flex; flex-direction: column;
  animation: panel-in var(--dur) var(--ease);
}
@keyframes panel-in { from { transform: translateX(24px); opacity: 0; } }
.panel-head {
  display: flex; align-items: baseline; justify-content: space-between;
  padding: var(--s6) var(--s6) var(--s3); border-bottom: 1px solid var(--hairline);
}
.panel-head h2 { font-family: var(--font-display); font-weight: 500; font-size: 1.5rem; }
.panel-close { background: none; border: none; color: var(--ink-muted); font-size: 1.4rem; }
.panel-close:hover { color: var(--accent); }
.panel-body { padding: var(--s4) var(--s6) var(--s8); overflow-y: auto; }
.panel-body h3 {
  font-family: var(--font-ui); font-size: 0.75rem; letter-spacing: var(--tracking-label);
  text-transform: uppercase; color: var(--ink-muted); margin: var(--s6) 0 var(--s3);
}
.swatch-hero { height: 120px; margin-bottom: var(--s3); }
.family-chain { color: var(--ink-muted); font-size: 0.85rem; margin-bottom: var(--s4); }
.linklike { background: none; border: none; color: var(--link); text-decoration: underline; padding: 0; font-size: inherit; }
.muted { color: var(--ink-muted); font-size: 0.85rem; }
.empty-note { color: var(--ink-faint); font-style: italic; margin-top: var(--s4); }

/* Copy fields */
.copy-field { display: flex; align-items: center; gap: var(--s3); padding: var(--s1) 0; }
.copy-label { font-size: 0.7rem; letter-spacing: var(--tracking-label); color: var(--ink-muted); width: 42px; }
.copy-field code { font-family: var(--font-mono); font-size: 0.9rem; }
.copy-field button { background: none; border: none; color: var(--link); font-size: 0.75rem; text-decoration: underline; }

/* Plates */
.plate-button { background: none; border: none; padding: 0; text-align: left; width: 100%; }
.plate { width: 100%; }
.plate-bars { display: flex; flex-direction: column; height: 110px; }
.plate-large .plate-bars { height: 220px; }
.plate-bar { flex-basis: 0; }
.plate figcaption { display: flex; gap: var(--s3); align-items: baseline; margin-top: var(--s2); }
.plate-number { font-size: 0.65rem; letter-spacing: var(--tracking-label); color: var(--ink-faint); }
.plate-names { font-family: var(--font-display); font-size: 0.9rem; }
.plate-list { display: flex; flex-direction: column; gap: var(--s4); margin-top: var(--s3); }
.plate-list .plate-bars { height: 64px; }
.combo-color-row { border-top: 1px solid var(--hairline); padding: var(--s3) 0; }
.export-row { display: flex; gap: var(--s3); margin-top: var(--s6); }
.export-row button {
  border: 1px solid var(--ink-faint); border-radius: var(--radius); background: none;
  padding: var(--s2) var(--s3); font-size: 0.8rem;
}
.export-row button:hover { border-color: var(--accent); }

/* Group swatch grid */
.swatch-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--s1); margin-top: var(--s3); }
.swatch-cell { aspect-ratio: 1; border: none; border-radius: var(--radius); }
```

- [ ] **Step 8: Extend the smoke test** — add to `tests/appSmoke.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server'
import { ColorDetail } from '../src/components/ColorDetail'
import { CombinationDetail } from '../src/components/CombinationDetail'

it('renders detail panels for real data without crashing', () => {
  const noop = () => {}
  expect(renderToString(<ColorDetail colorId={1} dispatch={noop} />)).toContain('Hermosa Pink')
  expect(renderToString(<CombinationDetail comboId={176} dispatch={noop} />)).toContain('Combination 176')
})
```

- [ ] **Step 9: Verify** — `make test` passes. In `make dev`: click an arc → color panel with swatch, codes, copy buttons, plate list; click a plate → combination panel; copy buttons say "copied ✓"; ribbon click → the pair's combinations; Escape closes; at group levels arc click → swatch grid panel; Vandar Poel's Blue shows the wallflower note.

- [ ] **Step 10: Commit**

```bash
git add src tests
git commit -m "feat: detail panels, combination plates, copy-to-clipboard"
```

### Task 13: Browse view

**Files:**
- Create: `src/components/BrowseView.tsx`
- Modify: `src/App.tsx` (replace browse placeholder), `src/styles/app.css`
- Test: `tests/appSmoke.test.tsx` (extend)

**Interfaces:**
- Consumes: `displayableCombinations`, `sizeBucket`, `ancestorAtLevel` (Task 7), `PlateCard` (Task 12), state/dispatch.
- Produces: `BrowseView({ state, dispatch })` — filter bar (size chips reusing state.sizes, broad-family select, contains-color select) + plate grid.

- [ ] **Step 1: Implement `src/components/BrowseView.tsx`**

```tsx
import { useState } from 'react'
import { ancestorAtLevel, displayableCombinations, sizeBucket } from '../core/dataset'
import type { Action, AppState } from '../core/state'
import type { SizeBucket } from '../core/types'
import { dataset } from '../data'
import { PlateCard } from './PlateCard'

const SIZES: SizeBucket[] = [2, 3, 4]

export function BrowseView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const [family, setFamily] = useState<string>('')   // broad group id or ''
  const [colorId, setColorId] = useState<string>('') // color id as string or ''

  const combos = displayableCombinations(dataset).filter((c) => {
    if (!state.sizes.includes(sizeBucket(c))) return false
    if (family && !c.colorIds.some((id) => ancestorAtLevel(dataset, id, 2) === family)) return false
    if (colorId && !c.colorIds.includes(Number(colorId))) return false
    return true
  })

  return (
    <div className="browse-view">
      <div className="browse-filters">
        <div className="size-filter" aria-label="Colors per combination">
          {SIZES.map((s) => (
            <button key={s} aria-pressed={state.sizes.includes(s)}
              onClick={() => dispatch({ type: 'toggleSize', size: s })}>
              {s === 4 ? '4+' : s}
            </button>
          ))}
        </div>
        <select value={family} onChange={(e) => setFamily(e.target.value)} aria-label="Color family">
          <option value="">any family</option>
          {dataset.data.groups.broad.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={colorId} onChange={(e) => setColorId(e.target.value)} aria-label="Contains color">
          <option value="">contains any color</option>
          {[...dataset.data.colors].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="muted">{combos.length} combinations</span>
      </div>
      <p className="hint">Taller bars suggest the dominant color — the main garment, the page background; slivers are accents.</p>
      <div className="browse-grid">
        {combos.map((c) => <PlateCard key={c.id} comboId={c.id} dispatch={dispatch} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Mount in `src/App.tsx`** — replace the browse placeholder with `<BrowseView state={state} dispatch={dispatch} />`.

- [ ] **Step 3: Styles** — append to `src/styles/app.css`:

```css
/* Browse */
.browse-view { height: 100%; overflow-y: auto; padding: var(--s6) var(--s8) var(--s12); }
.browse-filters { display: flex; align-items: center; gap: var(--s4); flex-wrap: wrap; }
.browse-filters select {
  font-family: var(--font-ui); font-size: 0.85rem; color: var(--ink);
  background: none; border: 1px solid var(--hairline); border-radius: var(--radius);
  padding: var(--s1) var(--s2);
}
.browse-grid {
  margin-top: var(--s6); display: grid; gap: var(--s6) var(--s4);
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
}
.browse-grid .plate-bars { height: 96px; }
```

- [ ] **Step 4: Extend smoke test**

```tsx
import { BrowseView } from '../src/components/BrowseView'
import { initialState } from '../src/core/state'

it('renders browse view with all 338 displayable combos', () => {
  const html = renderToString(<BrowseView state={initialState} dispatch={() => {}} />)
  expect(html).toContain('338 combinations')
})
```

- [ ] **Step 5: Verify** — `make test` passes; in the browser: grid shows 338 plates, filters narrow it live (e.g. family=Blue + contains=Corinthian Pink), size chips shared with the wheel state, clicking a plate opens the combination panel.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: browse view with size, family, and contains-color filters"
```

---

### Task 14: Search, surprise animation, About panel, hints

**Files:**
- Create: `src/components/SearchBox.tsx`, `src/components/AboutPanel.tsx`
- Modify: `src/components/Header.tsx` (mount SearchBox), `src/App.tsx` (render AboutPanel), `src/styles/app.css`

**Interfaces:**
- Consumes: `searchColors` (Task 7), `Panel` (Task 12).
- Produces: `SearchBox({ dispatch })`; `AboutPanel({ dispatch })`.

- [ ] **Step 1: `src/components/SearchBox.tsx`** — type-ahead over the 157 names:

```tsx
import { useRef, useState } from 'react'
import { searchColors } from '../core/dataset'
import type { Action } from '../core/state'
import { dataset } from '../data'

export function SearchBox({ dispatch }: { dispatch: (a: Action) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const matches = searchColors(dataset, q).slice(0, 8)

  function choose(id: number) {
    dispatch({ type: 'select', selection: { kind: 'color', id } })
    setQ('')
    inputRef.current?.blur()
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && matches[active]) choose(matches[active].id)
    else if (e.key === 'Escape') setQ('')
  }

  return (
    <div className="search-box">
      <input ref={inputRef} value={q} placeholder="find a color… (navy, olive)"
        aria-label="Search colors"
        onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKeyDown} />
      {matches.length > 0 && (
        <ul className="search-results" role="listbox">
          {matches.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button onMouseDown={() => choose(c.id)}>
                <span className="search-swatch" style={{ background: c.hex }} />
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Mount in `Header.tsx` nav, before the Wheel button: `<SearchBox dispatch={dispatch} />`.

- [ ] **Step 2: `src/components/AboutPanel.tsx`** — the book's story + the usage recipes from the spec's user stories (this copy ships as written):

```tsx
import { Panel } from './Panel'
import type { Action } from '../core/state'

export function AboutPanel({ dispatch }: { dispatch: (a: Action) => void }) {
  return (
    <Panel title="About" onClose={() => dispatch({ type: 'toggleAbout' })}>
      <p>
        In the 1930s, Japanese artist and teacher <strong>Sanzo Wada</strong> published
        <em> A Dictionary of Color Combinations</em> — six volumes of color pairings,
        trios, and quartets that remain a designer's treasure. This site puts all
        348 combinations (157 colors) at your fingertips.
      </p>
      <h3>Dress yourself</h3>
      <p>
        Want a fresh palette? Hit <strong>Surprise me</strong>, or browse 2–3 color
        combinations in families you like wearing. Taller bars suggest the main
        garment; slivers are accents.
      </p>
      <h3>Build around what you own</h3>
      <p>
        Search for your item's color ("navy"), open it, and see every combination
        the book endorses. Your shirt is never <em>exactly</em> Wada's blue — so
        zoom the wheel out a level and see what pairs with blues in general. If
        blues meet ochres twelve times, ochre belongs in your wardrobe.
      </p>
      <h3>Theme a website or deck</h3>
      <p>
        Find a combination you love, then copy its hex codes, CSS variables, or
        JSON straight into your project.
      </p>
      <h3>Learn from the master</h3>
      <p>
        Set the wheel to Families or Groups and read the ribbons: their thickness
        is how often Wada combined those families. The coarse wheel is a lesson
        in what harmonizes.
      </p>
      <p className="muted">
        Honesty notes: bar proportions are decorative (the source data has no
        plate ratios); ten one-color entries in the source are hidden as data
        errors; three five-color combinations appear under "4+".
      </p>
      <p className="muted">
        Data: <a href="https://sanzo-wada.dmbk.io" target="_blank" rel="noreferrer">sanzo-wada.dmbk.io</a>.
        Site by Daniel, vibe-coded with Claude.
      </p>
    </Panel>
  )
}
```

Render in `App.tsx`: `{state.aboutOpen && <AboutPanel dispatch={dispatch} />}`.

- [ ] **Step 3: Surprise animation** — deal-the-cards feel when a combination arrives via Surprise. In `app.css`:

```css
.panel .plate-large { animation: deal var(--dur) var(--ease); }
@keyframes deal {
  from { transform: translateY(14px) rotate(-1.5deg); opacity: 0; }
}
/* Search */
.search-box { position: relative; }
.search-box input {
  font-family: var(--font-ui); font-size: 0.85rem; color: var(--ink);
  background: none; border: none; border-bottom: 1px solid var(--hairline);
  padding: var(--s1) var(--s2); width: 180px;
}
.search-box input:focus { outline: none; border-bottom-color: var(--accent); }
.search-results {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 20;
  background: var(--paper-1); border: 1px solid var(--hairline); border-radius: var(--radius);
  list-style: none; padding: var(--s1); box-shadow: 0 8px 30px rgb(47 42 38 / 0.1);
}
.search-results button {
  display: flex; align-items: center; gap: var(--s2); width: 100%;
  background: none; border: none; padding: var(--s1) var(--s2); font-size: 0.85rem; text-align: left;
}
.search-results [aria-selected='true'] button, .search-results button:hover { background: var(--paper-2); }
.search-swatch { width: 14px; height: 14px; border-radius: 2px; display: inline-block; }
```

- [ ] **Step 4: Verify** — typing "pink" lists the pinks with swatches; arrow keys + Enter open the color; Surprise me deals a plate with the tilt-in animation; About opens with the recipes. `make test` + `make build` pass.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: color search, about panel with usage recipes, surprise animation"
```

---

### Task 15: PNG export

**Files:**
- Create: `src/exportPng.ts`
- Modify: `src/components/CombinationDetail.tsx` (add button)

**Interfaces:**
- Consumes: `Indexed`, `CombinationRecord`.
- Produces: `downloadPlatePng(ix: Indexed, combo: CombinationRecord): void` — renders the plate to a canvas and triggers a `sanzo-wada-<id>.png` download.

- [ ] **Step 1: Implement `src/exportPng.ts`**

```ts
// Renders a combination plate to a PNG download. Browser-only by design.
import type { Indexed } from './core/dataset'
import type { CombinationRecord } from './core/types'

const W = 1200
const H = 900
const BARS_H = 640
const TAPER = [1.5, 1.15, 0.9, 0.75, 0.7]

export function downloadPlatePng(ix: Indexed, combo: CombinationRecord): void {
  const colors = combo.colorIds.map((id) => ix.colorById.get(id)!)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#f8f6f2'
  ctx.fillRect(0, 0, W, H)

  const weights = TAPER.slice(0, colors.length)
  const total = weights.reduce((a, b) => a + b, 0)
  let y = 80
  colors.forEach((c, i) => {
    const h = (weights[i] / total) * BARS_H
    ctx.fillStyle = c.hex
    ctx.fillRect(80, y, W - 160, h)
    y += h
  })

  ctx.fillStyle = '#2f2a26'
  ctx.font = '28px Georgia, serif'
  ctx.fillText(colors.map((c) => c.name).join(' · '), 80, y + 56)
  ctx.fillStyle = '#7e7468'
  ctx.font = '22px Georgia, serif'
  ctx.fillText(`No. ${combo.id} — A Dictionary of Color Combinations, Sanzo Wada`, 80, y + 96)
  ctx.fillText(colors.map((c) => c.hex).join('   '), 80, y + 132)

  canvas.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sanzo-wada-${combo.id}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  })
}
```

- [ ] **Step 2: Add the button** in `CombinationDetail.tsx`'s export row:

```tsx
<button onClick={() => downloadPlatePng(dataset, combo)}>Download PNG</button>
```

with `import { downloadPlatePng } from '../exportPng'`.

- [ ] **Step 3: Verify manually** — download a 2-color and a 5-color plate; open the PNGs: bars, names, hexes, credit line all present. `make test` + `make build` pass.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: PNG plate export"
```

---

### Task 16: Polish — responsive, reduced motion, a11y

**Files:**
- Modify: `src/styles/app.css`, `src/components/Header.tsx` (footer seal is App), `src/App.tsx`

- [ ] **Step 1: Responsive** — append to `app.css`:

```css
@media (max-width: 760px) {
  .header { flex-direction: column; align-items: flex-start; gap: var(--s3); padding: var(--s3) var(--s4); }
  .nav { flex-wrap: wrap; }
  .search-box input { width: 130px; }
  .chord-wheel { max-width: 96vw; }
  .browse-view { padding: var(--s4); }
  .browse-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  /* Panels become bottom sheets */
  .panel {
    top: auto; left: 0; right: 0; width: auto; max-width: none; max-height: 72vh;
    border-left: none; border-top: 1px solid var(--hairline);
    animation: sheet-in var(--dur) var(--ease);
  }
  @keyframes sheet-in { from { transform: translateY(30px); opacity: 0; } }
}
```

- [ ] **Step 2: Reduced motion** — append:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

Also in `chordRender.ts`, wrap the crossfade durations:

```ts
const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
// use duration(motionOk ? 200 : 0) / duration(motionOk ? 300 : 0)
```

- [ ] **Step 3: Seal footer** — in `App.tsx`, after `<main>`:

```tsx
<footer className="footer">
  <span className="hanko" title="iro — color">色</span>
</footer>
```

```css
.footer { display: flex; justify-content: flex-end; padding: var(--s2) var(--s6); }
.hanko {
  width: 26px; height: 26px; background: var(--accent); color: var(--paper-1);
  font-size: 13px; display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius);
}
```

- [ ] **Step 4: A11y pass** — verify: every button has text or aria-label (search input, panel close, swatch cells with `title` get `aria-label={c.name}` too — add it); the SVG has role/aria-label pointing at Browse as the accessible alternative; keyboard: tab order through header, Escape closes panels; focus visible (add `:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }` to app.css).

- [ ] **Step 5: Verify across sizes** — `make dev`; devtools responsive mode at 375px: header wraps, panels are bottom sheets, wheel fits; desktop unchanged. `make test` + `make build` pass.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: responsive layout, reduced-motion support, a11y polish, hanko footer"
```

---

### Task 17: CI + GitHub Pages deploy

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md` (deployment section + live link)

- [ ] **Step 1: Confirm the GitHub remote.** Run `git remote -v`. If there is NO remote, **stop and ask the owner** before creating one (repo must be public for free-plan Pages): propose `gh repo create color-combinations --public --source=. --push`. If a remote exists, just push.

- [ ] **Step 2: Write `.github/workflows/deploy.yml`**

```yaml
name: Test, build, deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Enable Pages for Actions deploys**

```bash
gh api -X POST "repos/{owner}/{repo}/pages" -f build_type=workflow 2>/dev/null \
  || gh api -X PUT "repos/{owner}/{repo}/pages" -f build_type=workflow
```

- [ ] **Step 4: Update README** — replace the Deployment section:

```markdown
## Deployment

Every push to `main` runs tests + typecheck + build in GitHub Actions and, if
green, publishes to GitHub Pages automatically. Nothing to do by hand.

- Live site: https://<owner>.github.io/color-combinations/
- Pipeline: `.github/workflows/deploy.yml` (watch runs in the repo's Actions tab)
- If the repo is ever renamed, update `base` in `vite.config.ts` to match.
```

(Substitute the real owner login from `gh api user -q .login`.)

- [ ] **Step 5: Push and verify end-to-end**

```bash
git add .github README.md
git commit -m "feat: CI pipeline deploying to GitHub Pages"
git push -u origin main
gh run watch
```

Expected: run completes green. Then `curl -sI https://<owner>.github.io/color-combinations/ | head -1` → `HTTP/2 200`, and open the live site: wheel renders, fonts load, a panel opens, no console errors.

- [ ] **Step 6: Commit any README link fix, push.**

---

### Task 18: Docs true-up + v1 release

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md`, spec status line

- [ ] **Step 1: Docs sweep.** Read every doc top to bottom and fix drift:
  - README: remove "under construction"; confirm every command works as documented (run each `make` target); add a screenshot? No — TODO.md item instead (screenshots go stale).
  - CLAUDE.md: confirm architecture map matches the final file tree; dependency budget matches package.json exactly.
  - Makefile: `make help` output reads correctly.
  - Spec: change the Status line to `Status: v1 shipped (<date>)`.

- [ ] **Step 2: PROMPTS.md** — append a Session 2 entry summarizing execution (any owner prompts that occurred during implementation, verbatim).

- [ ] **Step 3: TODO ledger.** Any plan item skipped or discovered during execution → TODO.md. Move v1-completed entries to TODO-completed.md with `git log --oneline` hashes, e.g.:

```markdown
- [x] v1 site: wheel, browse, panels, search, exports, deploy — done in <hash of Task 17 commit> (2026-07-19)
```

- [ ] **Step 4: Final verification**

Run: `make test && make build` → green. `git status` → clean after commit.

- [ ] **Step 5: Commit and tag**

```bash
git add -A
git commit -m "docs: true-up all documentation for v1"
git tag v1.0.0
git push --follow-tags
```

---

## Self-Review Checklist (for the plan author — completed)

- Spec coverage: wheel+slider+sizes (T8/T11), browse (T13), color/combination/group/ribbon detail (T12), copy & export CSS/JSON/PNG (T9/T12/T15), search (T14), surprise (T10/T14), About+hints (T11/T13/T14), quirks policy (T5/T12/T14), grouping hierarchy (T4), data layer + schema versioning (T3–T6), core purity (T2), aesthetic tokens/fonts (T10), responsive+a11y+reduced motion (T16), CI/Pages (T17), docs contract (T1/T6/T18). Deferred spec items are all seeded into TODO.md (T1).
- Every step has real code or an exact command; no TBDs.
- Interface names cross-checked across tasks (`Indexed`, `ancestorAtLevel`, `chordMatrix`, `combosForPair`, `Selection`, `PlateCard` props, `dataset` singleton).
