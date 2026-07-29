# Iro 色 — A Dictionary of Color Combinations

An interactive website for exploring the 348 color combinations from Sanzo
Wada's 1930s classic *A Dictionary of Color Combinations* — as a circular
chord-diagram "color wheel", a browsable gallery of combination plates, and
a practical palette picker for websites, presentations, and outfits.

> **Status:** v1.4.0 shipped (2026-07-28) — Sample a color's third source is
> now **Pick a color**: a color wheel with a brightness slider plus synced
> HEX/RGB/CMYK fields (see [Sample a color](#sample-a-color)), replacing the
> hex-only picker. On top of analytics (v1.3.3), the touchscreen wheel
> (v1.3.2), the hex/photo color sampler (v1.3), and accessibility goggles
> (v1.2). Live at https://chendaniely.github.io/color-combinations/ — this
> README always reflects the current state of the project.

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
| `make install` | One-time (and after dependency changes): installs packages into `node_modules/`, and copies the face-detection files into `public/mediapipe/` |
| `make dev` | Starts a local preview at the printed URL (usually http://localhost:5173/color-combinations/) with live reload |
| `make test` | Runs the automated tests |
| `make build` | Type-checks everything and builds the deployable site into `dist/` |
| `make preview` | Serves the built `dist/` exactly as GitHub Pages will |
| `make update-data` | Re-downloads the source colors and regenerates the processed data |
| `make clean` | Deletes build output, the copied face-detection files, and `node_modules/` |

## Features

- **Dress yourself** — hit Surprise me, or browse 2–3 color combinations in
  families you like wearing. Taller bars suggest the main garment; slivers
  are accents.
- **Build around what you own** — search for your item's color, open it, and
  see every combination the book endorses. Don't have the exact shade? Zoom
  the wheel out a level to see what pairs with blues, ochres, etc. in
  general. Browse can also be filtered down to a single shade via a
  dismissible chip.
- **Match** (header tab) — build an outfit palette: start from a color, shade,
  or family, see what the book pairs it with, and add more to make a 3-, 4-,
  or more-color set. Also reachable from any Shade or Family group on the
  wheel via "Build a palette from this →".
- **Find colors that suit you** (the **You** tab) — photograph your face and
  get the book colors that go with your own coloring. See below.
- **Theme a website or deck** — find a combination you love, then copy its hex
  codes, CSS variables, or JSON straight into your project.
- **Learn from the master** — set the wheel to Families or Groups and read the
  ribbons: their thickness is how often Wada combined those families. The
  coarse wheel is a lesson in what harmonizes.

On a desktop you hover the wheel to preview a color or pair (its name shows in
the center) and click to open it. **On a touchscreen, press or drag a finger
over the wheel** to scrub that same preview live, then **lift your finger** to
open the one you've landed on — so you can hold and drag to explore and let go
when you find something you like. Changed your mind? Drag your finger off past
the edge of the wheel before lifting, and nothing opens.

### Sample a color

Next to the search box, **Sample a color** opens a small picker with three ways
to feed in a color — all landing on the same result:

- **Camera** (on devices that have one) — point at something and tap the color.
- **Upload a photo** — pick an image and tap/eyedrop a region.
- **Pick a color** — turn a color wheel, or type a hex, RGB, or CMYK value.

You then see the **12 nearest book colors** (with a "very close / close /
roughly" label), pick one, choose Color / Shade / Family, and jump into **Match**
or **Browse**. Uploaded photos and camera frames stay on your device — nothing
is uploaded or saved.

### Find colors that suit you

The **You** tab takes a photo of your face and works out three things about
your coloring:

- **Undertone** — whether your skin leans golden (warm) or pink and blue (cool).
- **Depth** — how light or dark your coloring is overall.
- **Contrast** — the gap in lightness between your skin and your hair.

Each of those has a small **i** button next to it that explains the term in
plain English.

**Hold something white next to your face** — paper, a mug, a wall, a t-shirt.
Cameras guess at the color of the light they're in, and that guess is what
destroys the warm/cool reading. Something white lets the site correct it. You
can skip it: the result is then marked *rough reading* and says the undertone is
unverified. Depth and contrast survive bad lighting fine, because they compare
things inside the same photo.

After the photo you get a **check screen** showing every spot it measured and
the color it took from each. Anything wrong, tap the right place instead. There
are also **Temperature** and **Tint** sliders, the same pair photo-editing apps
use, if the automatic white balance needs a nudge — the photo above updates as
you drag so you can see it working.

Then you get two palettes, and **they are not built the same way**:

- **Measured for you** — worked out from your face by four stated rules. Hover
  any color and it tells you why it's there.
- **A season palette** (Deep Autumn, Cool Summer, and so on) — the traditional
  twelve-season system. **These lists are ours; they have no published source.**
  They're here because they're useful if you've already had a color analysis
  done, and you can pick any of the twelve from the dropdown. Treat them as a
  second opinion, not a measurement of you.

Below that are the book's combinations, ordered by how much of each one is
yours, with any color that *isn't* yours outlined. A four-step control decides
how strict the list is.

One thing worth knowing: Wada's palette leans warm — 109 of its 157 colors read
warm against 48 cool — so cool-toned visitors get a shorter list here. That's
the book, not you, and the page says so.

#### Editing the season lists

The twelve season palettes live in **`data/curated/seasons.json`**. That file is
meant to be edited by hand — it's read directly by the site, so changing it and
refreshing the page changes the palettes. No code involved.

Each season lists the `colorIds` that belong to it. The ids match
`data/processed/colors-data.json`. A color can belong to several seasons.

If you break something — a color id that doesn't exist, an empty season, a
misspelled name — the site will refuse to start and `make test` will tell you
exactly what's wrong. That guard is deliberate: the file is meant to be edited,
so it needs to fail loudly rather than quietly show a broken palette.

### Accessibility goggles

A set of optional filters ("goggles") you can stack on any view — the Wheel,
Browse, and Match. The **Accessibility** control floats in the top-right corner
of the page (just below the header), so it sits in the same place on every view
and one selection carries across all three. Selected filters fill with the
owner's NYC blue; the menu closes when you click anywhere outside it. The
goggles narrow the combinations to those that meet an accessibility bar; turning
several on shows only combinations that pass *all* of them. They filter what you
see — they never change or hide the underlying book data.

- **Web text-ready** — at least one pair of the colors has enough contrast to
  use as readable text on a background (WCAG AA, 4.5:1).
- **Print & B&W safe** — every color stays tellable apart in grayscale, so the
  combination survives a black-and-white print or photocopy. (This is the
  honest version of "print-friendly"; true CMYK ink proofing needs a printer
  profile the site doesn't have, so it isn't claimed.)
- **Color-blind safe** — the colors stay distinct for the common red-green
  types of color blindness.

## How this project is organized

- `src/` — the website's code. `src/core/` is pure logic (no browser code),
  `src/color/` is color science (OKLab distance, skin metrics, white balance,
  via culori), `src/face/` is the one file allowed to talk to the face-detection
  model, `src/components/` is the UI, `src/viz/` is the D3 chord diagram.
- `data/raw/` — the vendored source data (downloaded from
  sanzo-wada.dmbk.io; the site never fetches it live). `data/processed/` —
  the generated, validated internal format the site actually reads.
  Regenerate any time with `make update-data`. If the source data ever has
  to change (e.g. licensing), only `scripts/ingest/` needs rewriting.
  `data/curated/seasons.json` is the opposite: written by hand, never
  generated — see [Editing the season lists](#editing-the-season-lists).
- `docs/superpowers/` — the design spec and implementation plans.
- `CLAUDE.md` — working rules for the AI sessions that maintain this repo.
- `PROMPTS.md` — the owner's prompts & decisions that shaped this project.
- `CHANGELOG.md` — release history, each entry paired with the owner prompt
  that drove it (a record of how a human steered this AI-built project).
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

## Privacy

The **You** tab handles a photograph of your face. Here is exactly what happens
to it.

- **Your photo is never uploaded.** It never leaves your device, is never sent
  to any server, and never reaches this site's operators.
- **Your photo is never saved.** It lives in the page's memory only while you're
  looking at it, and is discarded when you finish. Nothing is written to your
  device either — no files, no cookies, no browser storage.
- **Only numbers survive.** After the photo is measured, what remains is a
  handful of values: two colors (your skin and hair), three words (your
  undertone, depth and contrast), and a few measurements. Those live in the page
  until you close or refresh it, and go no further.
- **Face detection runs on your own machine.** The site uses Google's open
  BlazeFace model, but it runs *locally in your browser*, and the model file is
  served by this site from `public/mediapipe/` — not fetched from Google. No
  third-party request is made at any point while you use the tab.
- **The color sampler works the same way**, as it always has (see
  [Sample a color](#sample-a-color)).

These are enforced by tests, not just promised here: `tests/sample-privacy.test.ts`
forbids network and storage APIs anywhere in the photo-handling code, and
`tests/facePrivacy.test.ts` forbids any absolute URL in the face-detection layer,
so the model can never be quietly repointed at someone else's server.

The one exception is ordinary web analytics, which is separate from all of the
above and described next.

## Analytics

The published site loads **Google Analytics** (property `G-CHW8X8EX18`) to count
visits. It records ordinary web-analytics things — page views, roughly where in
the world a visit came from, what kind of device — and sets Google's cookies to
do it.

It never receives your photos, your face reading, or the colors you sample.
Those parts of the site run entirely on your device, exactly as described under
[Privacy](#privacy) — the analytics tag and the photo-handling code don't touch
each other.

**The tag is only in the deployed site.** It's injected during `make build`, so
`make dev` never reports your own local sessions as real traffic. If you want to
see it, run `make build` and look at the bottom of `<head>` in `dist/index.html`.

To change the property ID or turn analytics off entirely, edit the
`google-analytics` plugin in `vite.config.ts` — that's the only place it lives.
Deleting that plugin block removes analytics completely (you'd also delete
`tests/analytics.test.ts`, which guards it).
