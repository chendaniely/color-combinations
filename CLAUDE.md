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
- `CHANGELOG.md` — user-facing release history. **On every release, add a
  top entry that pairs what changed with the owner's guiding prompt(s),
  quoted verbatim from `PROMPTS.md`.** The point of this file is to show
  that the project is human-guided, not blindly vibe-coded — keep that
  framing; don't reduce it to a bare list of changes.
- The spec (`docs/superpowers/specs/`) — update if the design changes.

## Architecture rules (see spec for rationale)

- `src/core/` is a **pure TypeScript kernel**: only relative imports of
  other core files; no React, D3, or browser globals. Enforced by
  `tests/core-purity.test.ts` — never weaken that test.
- The app reads exactly two data files, both schema-versioned and validated
  at load by `src/data.ts` — the ONLY module allowed to import a data file:
  - `data/processed/colors-data.json` is **generated** from a vendored
    source and must never be hand-edited. Source-format knowledge lives
    ONLY in `scripts/ingest/`.
  - `data/curated/seasons.json` is **authored by hand** and never
    generated. `scripts/seed-seasons.ts` produced the first version and is
    not part of the build; re-running it overwrites curation. It holds the
    twelve season→color palettes, which have no published source and are
    ours — kept as data precisely so they can be audited and corrected
    without touching TypeScript.
- App state is one serializable object (`src/core/state.ts`).
- Every design token (color/font/spacing/motion) lives in
  `src/styles/tokens.css`. No hard-coded colors in components — Sanzo
  Wada's data colors excepted.
- All D3 code stays in `src/viz/`.
- Pure `parseHex` (color string parsing) lives in `src/core/colorMath.ts`;
  browser components that sample colors live in `src/components/sample/`
  (camera-only pieces stay in `src/components/camera/`), guarded by
  `tests/sample-privacy.test.ts` against network/storage APIs.
- Analytics lives ONLY in the `google-analytics` plugin in `vite.config.ts`,
  injected at build time (`apply: 'build'`) so `make dev` never reports as
  real traffic. Never move the tag into `index.html` (it would fire in dev)
  or into `src/` (it would sit next to the privacy-guarded sampler).
  `tests/analytics.test.ts` enforces the build-only gate — don't weaken it.

## Dependency rules

This used to be a whitelist of four packages. The owner reopened it in
v1.5.0 — *"the original constraight was to make it so the app runs and
launches easily, but i may have been tto strict in my words"* — and the
audit found the real constraint was never the package count. It is these
four properties. **A new dependency is allowed if and only if it keeps all
four true.**

1. **Builds to static files.** No server, no API, no request-time work.
   GitHub Pages serves the output as-is.
2. **`make install && make dev` just works.** npm only — no native
   compilation, no Python, no separate download step. Anything npm won't
   deliver gets vendored into the repo (see `data/raw/`,
   `vendor/mediapipe/`).
3. **Nothing user-derived leaves the device.** Any asset must be
   self-hosted from our own origin. A third-party CDN request is a leak
   even when it carries no payload, because it reveals that the visitor is
   on this page.
4. **Weight is paid by the feature that incurs it.** Anything large must
   lazy-load on entering its tab, never in the main bundle.

Runtime: react, react-dom, d3, culori, @mediapipe/tasks-vision. Dev: vite,
typescript, vitest, @vitejs/plugin-react, tsx, @types/react,
@types/react-dom, @types/d3, @types/node, jsdom, @testing-library/react,
@testing-library/dom.

Justifications: tsx = run TypeScript scripts under Node (ingest, season
seeding); @vitejs/plugin-react = Vite's React glue; @types/* = TypeScript
definitions; culori = perceptual color math (OKLab / ΔE / Lab) so we don't
hand-roll color science — used ONLY in `src/color/`, never in the pure
`src/core/` kernel; jsdom + @testing-library/* = unit-test DOM interaction
(other UI is covered by renderToString smoke + the owner browser checklist);
@mediapipe/tasks-vision = on-device face detection for the You tab,
Apache-2.0 with zero transitive dependencies, ~3.5 MB lazy-loaded and
self-hosted from `public/mediapipe/`.

culori ships no types, so `src/color/culori.d.ts` declares the functions we
use (`differenceEuclidean`, `wcagContrast`, `filterDeficiencyProt`,
`filterDeficiencyDeuter`, `converter`).

### Non-core layers

Both exist so `src/core/` stays a dependency-free kernel and
`core-purity.test.ts` is never weakened:

- `src/color/` — portable color logic that may use npm libs: the
  color-distance seam, nearest-color lookup, the accessibility "goggles",
  skin metrics, white balance, and the personal-palette scoring rules.
- `src/face/` — **the only place MediaPipe may be imported.**
  `detect.ts` returns a plain `FaceGeometry`, so nothing downstream knows
  the detector exists and swapping models touches one file. Guarded by
  `tests/facePrivacy.test.ts`: no absolute `http(s)` URL may appear here,
  so the model can never be silently repointed at a CDN.

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
