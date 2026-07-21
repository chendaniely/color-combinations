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

Runtime: react, react-dom, d3, culori. Dev: vite, typescript, vitest,
@vitejs/plugin-react, tsx, @types/react, @types/react-dom, @types/d3,
@types/node, jsdom, @testing-library/react, @testing-library/dom.

Justifications: tsx = run TypeScript scripts under Node (ingest);
@vitejs/plugin-react = Vite's React glue; @types/* = TypeScript
definitions; culori = perceptual color-difference math (OKLab / ΔE) so we
don't hand-roll color science — used ONLY in `src/color/` (see below), never
in the pure `src/core/` kernel; jsdom + @testing-library/react +
@testing-library/dom = unit-test the camera UI's DOM interaction (the app's
other UI is covered by renderToString smoke + the owner browser checklist).
culori ships no types, so `src/color/culori.d.ts` declares the one function we
use. **Adding any other dependency requires appending a justification line
here in the same commit.**

`src/color/` is a NON-core layer for portable color logic that may use npm
libs (culori): the color-distance seam and nearest-color lookup live here so
`src/core/` stays a dependency-free kernel and `core-purity.test.ts` is never
weakened.

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
