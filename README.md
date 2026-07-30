# Iro 色 — A Dictionary of Color Combinations

An interactive website for exploring the 348 color combinations from Sanzo
Wada's 1930s classic *A Dictionary of Color Combinations* — as a circular
chord-diagram "color wheel", a browsable gallery of combination plates, and
a practical palette picker for websites, presentations, and outfits.

> **Status:** v1.9.2 shipped (2026-07-30) — **every color on the You page is now
> a starting point**: the "What the book has for …" rows are clickable like the
> swatches, and whichever you pick is marked on the color itself. Before it,
> v1.9.1 — on the **You** tab, *Take a photo*
> moved to the top where it can't be lost under a page of colours, and the
> Browse / Start-a-palette buttons became **one bar that travels with you as you
> scroll** instead of three copies. Before it, v1.9.0 — every way into a color now
> lives in
> one gallery, shown both in **Match > Colors** (which used to be a dead end) and
> behind the header button, whose pencil icon is now a **camera with a visible
> label**. Before it, v1.8.3 — the corner seal is pinned and now
> carries the version number, linked to its changelog entry; the You tab's
> doorways appear above the colours as well as below, and "Start a palette
> from …" follows the swatch you pick. Before it, v1.8.2 — the doorways carry your
> whole palette into Browse, with the four-step floor control, instead of a
> single colour. Before it, v1.8.1 — a bug hunt and a documentation audit:
> Back now returns to the previous tab, and the warm/cool count the site quotes
> is computed from the book rather than typed in (it had been wrong in three
> places for several releases). Before it, v1.8.0 — **every screen has an address**:
> deep links, a Copy link button, and Back that closes a panel. Your season is
> shareable; your measurements deliberately are not (see
> [Sharing what you find](#sharing-what-you-find)). Before it, v1.7.3: every exported PNG
> was carrying a contrast colour v1.6.0 had retired, and a manual checklist item
> became an automated one that measures all 338 combinations. Before it, v1.7.2:
> four screens that would
> have crashed the whole app on a bad link, two contrast violations on a screen
> nothing was auditing, and a classification that depended on the order of lines
> in a file. Before it, v1.7.1's backlog pass: overlay focus
> handling, a latent Browse crash fixed before it could bite, and two open
> questions settled with measurements. On top of v1.7.0, which replaced the
> invented season palettes with **PCCS** — the colour system published by the
> institute Sanzo Wada founded in 1927, six years before this book (see
> [Where the seasons come from](#where-the-seasons-come-from)). Before that:
> the v1.6.0 consolidation and its **real-browser test suite** (see
> [Testing](#testing)), the You tab (v1.5.0), the color picker (v1.4.0),
> analytics (v1.3.3), the touchscreen wheel (v1.3.2), the hex/photo color
> sampler (v1.3), and accessibility goggles (v1.2). Live at
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
| `make install` | One-time (and after dependency changes): installs packages into `node_modules/`, and copies the face-detection files into `public/mediapipe/` |
| `make dev` | Starts a local preview at the printed URL (usually http://localhost:5173/color-combinations/) with live reload |
| `make lint` | Checks the code for likely mistakes (about a second) |
| `make test` | Runs the fast automated tests (a few seconds, no browser needed) |
| `make coverage` | Shows which code the fast tests never run |
| `make install-browser` | One-time: downloads the browser the layout tests drive (see [Testing](#testing)) |
| `make test-browser` | Runs the slower tests that check how the site actually *looks* |
| `make check` | Runs lint + tests + build together, keeps the full log in `check.log`, and fails loudly — the one to use before shipping |
| `make build` | Type-checks everything and builds the deployable site into `dist/` |
| `make preview` | Serves the built `dist/` exactly as GitHub Pages will |
| `make update-data` | Re-downloads the source colors and regenerates the processed data |
| `make clean` | Deletes build output, the copied face-detection files, and `node_modules/` |

## Testing

There are **two** test suites, and the split matters.

`make test` is the fast one — around 850 checks in a few seconds (that count is
a snapshot, not a promise; it was 600 two releases ago). It runs
without a browser, using a simulated one called jsdom. That makes it quick
enough to run constantly, but jsdom has a hard limit: **it never actually
draws anything.** It does no layout and applies no CSS. So it can confirm the
site *calculates* the right answer, and cannot tell you whether the answer is
visible, readable, or on top of something else.

That limit is not theoretical. Five user-visible defects reached the live site
past a fully green run of this suite — a color wheel that rendered more
saturated than the numbers printed beneath it, a button that could not be
reached on a short screen, color codes in the wrong typeface, a valid field
that turned the same orange as an invalid one, and a label sitting underneath
its own slider. Every one was found by a person opening a browser and looking.

`make test-browser` is the answer to that. It drives a real Chromium browser
over the built site and asserts the things only a browser knows: computed
colors, fonts, and the actual position of elements on screen. Each of those
five defects now has a test that would have caught it. It needs a one-time
`make install-browser` first, which downloads a private copy of Chromium
(~95 MB) so the results are identical on every machine and in CI.

Both suites run in CI on every push, and the site is not deployed unless both
pass.

`make lint` is a third, cheaper check: it reads the code for mistakes without
running it — a React hook missing a dependency, a keyboard trap, an accessible
name that isn't there. It runs in CI too.

`make coverage` answers a different question: *which code do the tests never
run at all?* It is a question, not a score to chase — but it's how we found
that copying a colour code and downloading a plate as a PNG, two things
visitors actually do, had no automated test behind them. Both now have one.

## Features

- **Dress yourself** — hit Surprise me, or browse 2–3 color combinations in
  families you like wearing. The bar heights on a plate are decorative: the
  book records which colors belong together, not how much of each to use.
- **Build around what you own** — search for your item's color, open it, and
  see every combination the book endorses. Don't have the exact shade? Zoom
  the wheel out a level to see what pairs with blues, ochres, etc. in
  general. Browse can also be filtered down to a single shade via a
  dismissible chip.
- **Match** (header tab) — build an outfit palette: start from a color, shade,
  or family, see what the book pairs it with, and add more to make a 3-, 4-,
  or more-color set. Also reachable from any Shade or Family group on the
  wheel via "Build a palette from this →", and its **Colors** level offers the
  same four ways to bring in a color as [Sample a color](#sample-a-color) below.
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

Next to the search box, the **camera button labelled "Sample"** opens a gallery
of every way to feed in a color — all landing on the same result:

- **Search by name** — focuses the search box in the header, if you know what
  the color is called.
- **Camera** (on devices that have one) — point at something and tap the color.
- **Upload a photo** — pick an image and tap/eyedrop a region.
- **Pick a color** — turn a color wheel, or type a hex, RGB, or CMYK value.

**The same four cards appear on the Colors level of the Match tab**, so you can
start a palette from a color you sample rather than one you happen to have open.
It is the same gallery in both places, not a copy.

Whichever you choose, you then see the **12 nearest book colors** (with a "very
close / close / roughly" label), pick one, choose Color / Shade / Family, and
jump into **Match** or **Browse**. Uploaded photos and camera frames stay on
your device — nothing is uploaded or saved.

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

Both lists are long, so the two ways out — **Browse all N in the book** and
**Start a palette from …** — sit in a bar pinned to the top of the screen that
travels with you while you scroll them.

**Click any color on the page to start from that one instead** — a swatch, or
the book's match in the "What the book has for …" panel. The one you pick is
ringed. (In that panel only the right-hand color is clickable: the left is the
season's *ideal*, which the book does not contain.)

One thing worth knowing: Wada's palette leans warm — 110 of its 157 colors read
warm against 47 cool — so cool-toned visitors get a shorter list here. That's
the book, not you, and the page says so. (Those two numbers are computed from the
book at load time rather than typed in, because for several releases they were
typed in as 109 and 48 and nothing checked them.)

#### Where the seasons come from

They used to be made up. As of v1.7.0 they're computed from **PCCS** — the
Practical Color Co-ordinate System, published in 1964 by the Japan Color
Research Institute.

Which is the interesting part: **Sanzo Wada founded that institute**, in 1927,
six years before he published this book. Korean personal colour analysis
(퍼스널컬러) is built on PCCS to this day. So the rules and the colours share an
ancestor.

There are **two levels**, shown separately because they aren't equally solid:

- **The four seasons** — Spring, Summer, Autumn, Winter — follow a published
  rule: a warm or cool half of the PCCS hue circle, plus a set of its tones.
- **The twelve sub-seasons** — Deep Autumn, Cool Summer and the rest — are
  **ours**. No published source defines them consistently, and the site labels
  them as ours rather than pretending otherwise.

Nothing is hand-picked either way. Which colours land in a season falls out of
the rules, and each one shows **how close it actually is** — because what you
get are the nearest matches in Wada's book, not exact season colours. The book
was printed in 1933 for pigments: only eleven of its 157 colours are genuinely
muted, so the soft seasons are served by approximations. Showing that gap
seemed better than hiding it.

The full story, with sources, is in
[`docs/color-analysis-sources.md`](docs/color-analysis-sources.md).

#### Editing the season rules

Edit **`data/curated/season-rules.json`** — it's read directly by the site, so
changing it and refreshing changes the seasons. No code involved.

Then run `npm run build-season-colors` to regenerate the colour lists from your
edited rules. `make test` fails if you forget.

If you break something — a tone that doesn't exist, a sub-season claiming to be
sourced, a hue left out of the warm/cool split — the site refuses to start and
`make test` says exactly what's wrong. That guard is deliberate: the file is
meant to be edited, so it has to fail loudly rather than quietly show a broken
palette.

#### The colour datasets

Each of these is self-contained, cited, and usable on its own — you don't need
this website to get something out of them.

| File | What it is |
| --- | --- |
| `data/reference/sources.json` | Every source cited by the others, with what each one supports |
| `data/reference/pccs-hues.json` | The 24-hue PCCS circle, Japanese and English names |
| `data/reference/pccs-tones.json` | The 12 tones (vivid, pale, deep…) and their bands |
| `data/reference/pccs-grid.json` | 288 colours as hex — 24 hues × 12 tones |
| `data/curated/season-rules.json` | The season rules, marked sourced or ours |
| `data/processed/season-colors.json` | Season → colour → how well it fits |

`pccs-grid.json` may be the most useful on its own: a PCCS hue/tone grid as hex
codes is surprisingly hard to find. It's *our rendering* of the published PCCS
structure, not the institute's own chip values — close to a real PCCS colour
card, not identical.

Run `make check-links` to check every cited URL still resolves. It's not part of
`make test` on purpose: whether someone else's website is up isn't a fact about
this project.

### Sharing what you find

Every screen now has its own address. Open a colour, filter Browse down to
reds, build a palette, find your season — the address bar updates as you go, so
copying it shares exactly what you are looking at. There is a **Copy link**
button on combinations, on a built palette, and on your season result, because
phone browsers hide the address bar while you scroll.

A few deliberate choices worth knowing:

- **Your season is shareable. Your measurements are not.** A link to your
  season carries the words `season=deep-autumn` and nothing else. It does not
  contain your skin tone, your hair colour, or any of the numbers measured from
  your face. Those would otherwise end up in whatever chat you pasted the link
  into, and on that service's servers. The trade-off is real and accepted: the
  "Measured for you" palette can't be reproduced from a link, and you can't
  bookmark your own full result — reloading still means retaking the photo.
- **Someone opening your season link sees a clear note** saying it came from a
  link and that nothing on the page is a measurement of *them*, with an
  invitation to take their own photo.
- **The Back button closes a panel** rather than leaving the site, which is what
  most people expect and what the Android back gesture means. Changing a filter
  does not add a history entry, so browsing around doesn't bury you in them.
- **The front page has no `#` in its address**, as it always has.
- **An old link still works, or says why not.** A link to a colour that isn't in
  the book explains itself; a saved palette that has lost a colour opens with
  the rest of it.

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
  `data/reference/` holds the PCCS colour-system data and the citation
  registry; `data/curated/season-rules.json` is written by hand and never
  generated — see [Editing the season rules](#editing-the-season-rules).
- `tests/` — the fast suite. `tests/browser/` is the separate real-browser
  suite run by `make test-browser` (see [Testing](#testing)); it is deliberately
  excluded from `make test`.
- `docs/superpowers/` — the design spec and implementation plans.
- `docs/color-analysis-sources.md` — where the season colours come from:
  the Wada → Japan Color Research Institute → PCCS → Korean personal-colour
  chain, with sources, and a plain statement of what's sourced and what's ours.
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
  served by this site from `public/mediapipe/` — not fetched from Google. The
  face detection makes no third-party request at all. (The site as a whole loads
  analytics on every page, described below; that is the only outside connection
  it makes, and it never sees anything from this tab.)
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
