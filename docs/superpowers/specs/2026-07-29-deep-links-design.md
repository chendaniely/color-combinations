# Shareable deep links — design

**Date:** 2026-07-29
**Status:** implemented in v1.8.0

## Correction, 2026-07-29 (after shipping)

Specs here are living documents, but the way to correct one is a dated block
like this rather than a silent edit — the document records what was decided on a
day, and editing it away destroys that while pretending nothing happened.

**"Everything else … replaces" was wrong about VIEWS.** The section below lists
`view` among the things that replace rather than push. Built that way, it meant
opening the You tab, taking a photo and pressing Back left the SITE rather than
returning to the wheel — and lost the reading on the way out. Found by probing a
real browser after release.

Views now PUSH. Four tabs cannot bury a history the way granularity clicks
would, and returning to the previous tab is what Back means everywhere else on
the web. The owner's decision covered panels and filters; views were never
mentioned, so this is filling a gap rather than reversing a choice.

**Back still does not close a full-screen overlay**, which the spec did not
consider at all. Two implementations were tried and reverted; see the entry in
`TODO.md` and the note in `src/components/Overlay.tsx` for what each taught.

## The problem

Nothing in `src/` touches `location` or `history`, so **no screen on this site
can be linked to.** Someone finds their season and the only way to show a
friend is to make them redo the photo. A combination they love is a screenshot
or nothing. This has been the top item in `TODO.md` since 2026-07-29, described
there as "the biggest open question".

It is cheap here by design. App state is one serializable object
(`src/core/state.ts`), and `CLAUDE.md` says that decision was made *for* this:

> **"No router library" is not "no URLs".** … serialising the one state object
> into `location.hash` and reading it back on load is a few lines and adds no
> dependency. What is banned is pulling in React Router to do it.

## Two decisions the owner made

### 1. A shared You-tab link carries the SEASON, never the reading

`SkinReading` holds `skin: '#a1673f'` and `hair: '#1a1110'` — the visitor's
actual skin and hair colour, white-balanced off their face. Putting that in a
URL would mean a link that, pasted into Slack, publishes the sender's skin tone
to someone else's server. By their own hand, enabled by our design, and probably
without them realising.

The fragment never reaches *our* server, which is a genuine privacy property of
hash routing. It does not help here: the risk is the recipient.

So a You link carries `season` and `floor` only:

```
#/you?season=deep-autumn&floor=2
```

**Consequences, accepted:**

- The "Measured for you" palette cannot be reproduced from a link, because it
  is computed from the reading.
- The visitor cannot bookmark their own full result. Reloading still means
  retaking the photo.
- The You tab needs a new branch for "season, but no reading" (below).

Enforced by `tests/urlPrivacy.test.ts`, not merely intended.

### 2. Back closes a panel; filters do not stack up history

Opening a colour, combination, group or ribbon pushes a history entry, so Back
closes it — which is what people expect, and on Android Back *is* the system
gesture for "dismiss this". Everything else (view, granularity, sizes, filters,
goggles, palette, floor) replaces, so browsing does not fill the history with
junk.

```
wheel -> open Hermosa Pink -> Back   = panel closes, still on the wheel
wheel -> change granularity 3x -> Back = leaves the site
```

## The URL format

Hash-based. GitHub Pages serves static files, so a path route would 404 on
refresh. Readable rather than an encoded blob: these are links people paste to
each other, and a legible one can be understood, edited and debugged.

**Defaults are omitted.** A clean state produces a clean URL, not a wall of
`g=0&sizes=2,3,4&level=1`.

| Param | State | Notes |
| --- | --- | --- |
| `#/<view>` | `view` | `wheel` \| `browse` \| `match` \| `you`. Omitted for `wheel`. |
| `g` | `granularity` | 0–3, omitted when 0 |
| `sizes` | `sizes` | e.g. `2,3`; omitted when all three |
| `open` | `selection` | `color:42`, `combination:331`, `group:deep-blues`, `ribbon:1:keyA:keyB` |
| `family` `shade` `color` | `browse` | omitted when empty |
| `level` `keys` | `palette` | `keys` comma-separated; `level` omitted when 1 |
| `lens` | `access` | e.g. `web-text,colorblind`; omitted when empty |
| `season` `floor` | `you` | `floor` omitted when 2 |
| `about` | `aboutOpen` | `1` when open |

`selection` travels as a PARAM, not a path segment, because a panel sits *over*
a view: a colour found in Browse should open a link that lands the reader in
Browse, not on the wheel.

Examples:

```
(no hash at all)                          the default wheel, nothing set
#/browse?family=reds&sizes=2,3
#/wheel?g=1&open=color:42
#/match?keys=olives,deep-teals
#/you?season=deep-autumn&floor=2
#/browse?family=reds&lens=colorblind
```

**The default state writes NO hash**, not `#/` or `#`. `encodeState` returns an
empty string for `initialState`, and `urlSync` then clears the fragment rather
than writing an empty one. Two reasons: the site's own front page should have
the same address it has always had, and a trailing `#` in a pasted link looks
like a mistake. Round-tripping still holds — `decodeState('')` gives `{}`, which
merges onto `initialState` and is the same state.

## Architecture

Two modules, split along the purity line `CLAUDE.md` already enforces.

### `src/core/urlState.ts` — pure

```ts
export function encodeState(state: AppState): string
export function decodeState(hash: string): Partial<AppState>
```

String work only. No `location`, no `window`, no `history` — so it stays in the
kernel and `tests/core-purity.test.ts` stays green. This is also the whole of
the interesting logic, which means the whole of the interesting logic is
testable without a browser.

`decodeState` returns only values that are **syntactically** valid: correct
shapes, in-range enums, well-formed numbers. It does NOT check ids against the
dataset, because core cannot see the dataset. Anything it does not recognise is
omitted, so the caller's merge over `initialState` fills the gap.

### `src/urlSync.ts` — the browser half

Reads `location.hash` once on load, writes on state change, listens for
`popstate`. Owns the push-vs-replace decision, comparing the incoming state's
`selection` with the outgoing one.

It also **sanitises against the dataset**, which core cannot do — see below.

## A crash this feature must fix first

`PaletteTray.tsx` and `SuggestionList.tsx` both call `keyName(dataset, k)`,
which **throws** on a key the book has not got. v1.7.2 fixed that class of bug
in Browse and the three detail panels, and missed these two because nothing
could reach them with a bad key.

A link is exactly what reaches them with a bad key. `#/match?keys=not-a-shade`
would take down Match.

Two changes, both required:

1. `urlSync` drops palette keys, browse filters and `open=` ids that the
   dataset does not contain. A stale palette link loses the colours the book
   has not got and keeps the rest — better than an error, and better than
   silently showing an empty Match.
2. `PaletteTray` and `SuggestionList` switch to `keyLabel`, the tolerant
   variant added in v1.7.2, so a key that slips through renders as itself
   rather than throwing.

Belt and braces on purpose: sanitising is the behaviour, and `keyLabel` is the
guarantee that a miss cannot cost the page.

## The You tab with a season and no reading

Required by decision 1: a shared link has no reading in it.

```
Autumn  [from a published system]
└ Deep Autumn  [our subdivision]

  Opened from a shared link — these are Deep Autumn's colours.
  Take your own photo to see how it compares.

  [the season palette, ranked, with fit bands]
  [the fit panel: ideal beside nearest-in-the-book]
```

`YouView` currently gates every palette on `reading &&`. It gains a second
branch: `season && !reading` renders the season palette and the fit panel, with
no "Measured for you" tab — there is nothing measured — and an invitation to
run the analysis themselves.

`PaletteTabs` takes `reading` as a required prop today. It becomes optional:
with no reading there is no measured palette and no tab strip, just the season.

## Share buttons

The address bar always reflects the state, so copy-and-paste works with no UI
at all. But mobile browsers hide the address bar, which would make the feature
invisible on the device where most photos are taken.

One reusable `src/components/ShareLink.tsx`, using the existing `copyText`
helper and its established "Copied" feedback pattern, in three places:

- **Combination detail** — beside Copy CSS and Download PNG, where the takeaway
  affordances already live.
- **The You tab result** — the motivating use case.
- **The Match palette** — where it doubles as the "save / export a built
  palette" half of the `TODO.md` item, since a link to a palette IS a saved
  palette on a site with no accounts.

## Testing

- **`tests/urlState.test.ts`** — round-trips. Every state shape encodes and
  decodes to itself; defaults are omitted from the output; garbage
  (`#/nonsense?g=99&open=color:abc`) yields safe defaults rather than throwing;
  an unknown view falls back to `wheel`.
- **`tests/urlPrivacy.test.ts`** — the enforcement of decision 1. For any
  reading, `encodeState` must not emit `skin`, `hair`, `ita`, `skinL`,
  `skinHue`, `contrastGap` or `whiteBalanced` — checked by field name AND by
  searching the output for the values themselves, so a rename cannot slip past.
  Sits alongside `sample-privacy.test.ts` and `facePrivacy.test.ts`, and must
  never be weakened.
- **`tests/browser/deepLinks.spec.ts`** — the address bar updates as you
  browse; a pasted link restores the view, the filters and the open panel; Back
  closes a panel; three filter changes then Back leaves the site; a stale link
  (`open=color:999999`, `keys=not-a-shade`) explains itself or drops the bad
  part rather than crashing.
- Existing suites must stay green, in particular `core-purity.test.ts`
  (`urlState.ts` must import nothing outside core) and the a11y audit (the new
  Share buttons and the shared-link note are new content on audited screens).

## Documentation the contract requires

- `README.md` — a section on shareable links for a non-JS reader: what is in a
  link, what is deliberately not, and why.
- `CLAUDE.md` — the URL-state seam (pure encoder in core, browser sync outside)
  and the rule that a reading never enters a URL.
- `CHANGELOG.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md` as usual.

## Explicitly out of scope

**Open Graph preview cards.** `TODO.md` pairs them with this feature, and they
do belong together — but a card needs a 1200×630 image the owner should approve
rather than something invented unattended.

Worth recording now, because it is a consequence of THIS design rather than of
effort: **hash routing makes per-link previews permanently impossible.**
Everything after `#` is never sent to the server, and link crawlers do not run
JavaScript, so every link on this site will show the same card no matter which
screen it points at. Per-combination previews would need path-based URLs and a
pre-rendered page per combination — a much larger build that would undo the
simplicity making deep links cheap. One site-wide card is the ceiling, and that
is an acceptable trade.

The image can be generated rather than designed: `exportPng.ts` already renders
1200×900 plates, so a 1200×630 card from Wada's own colours is the same
machinery pointed at a different canvas. Candidates for the owner to choose
from, after this ships.
