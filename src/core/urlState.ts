// The one app-state object, as a URL — and back.
//
// This is the whole of deep linking's interesting logic, and it is pure: no
// `location`, no `window`, no `history`, no dataset. Those live in
// src/urlSync.ts. Keeping the split means all of this is testable without a
// browser, and `tests/core-purity.test.ts` stays green.
//
// Two rules shape everything here.
//
// 1. A URL is the ONLY input to this site that arrives from outside it —
//    someone else's chat window, a truncated link, a hand-edited address, a
//    link from a version of the site that no longer exists. So `decodeState`
//    trusts nothing. Anything it does not recognise is OMITTED from the result
//    rather than defaulted in place, so the caller's merge over `initialState`
//    fills the gap and the app always has a state it can render.
//
// 2. A SkinReading NEVER goes in. `you.reading` holds the visitor's actual skin
//    and hair colour, measured off their face; a link carrying those, pasted
//    into a chat, would publish the sender's skin tone to someone else's
//    server. The owner chose season-only on 2026-07-29. Enforced by
//    tests/urlPrivacy.test.ts — see the note by `encodeState`.
import {
  initialState,
  type AppState,
  type FloorStop,
  type MatchLevel,
  type Selection,
} from './state'
import type { AccessLensId, GranularityLevel, SizeBucket } from './types'

const VIEWS: AppState['view'][] = ['wheel', 'browse', 'match', 'you']
const LENSES: AccessLensId[] = ['web-text', 'print-bw', 'colorblind']
const SIZES: SizeBucket[] = [2, 3, 4]
const SELECTION_KINDS = ['color', 'combination', 'group', 'ribbon'] as const

/** Longest hash we will even look at. A link past this is not a link. */
const MAX_HASH = 2000

function sameSizes(a: SizeBucket[], b: SizeBucket[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function encodeSelection(sel: Selection): string {
  switch (sel.kind) {
    case 'color':
    case 'combination':
      return `${sel.kind}:${sel.id}`
    case 'group':
      return `group:${sel.id}`
    case 'ribbon':
      // Sizes are appended only when the ribbon carried its own, which happens
      // when it was opened while the size chips differed from the global set.
      return `ribbon:${sel.level}:${sel.keyA}:${sel.keyB}`
        + (sel.sizes ? `:${sel.sizes.join('.')}` : '')
  }
}

/**
 * The state as a hash, or `''` for the default state.
 *
 * Empty rather than `#` or `#/`: the front page should keep the address it has
 * always had, and a trailing `#` in a pasted link looks like a mistake.
 *
 * Every value equal to its `initialState` default is left out, so a shared link
 * is short enough to read and to trust.
 *
 * NOTE FOR ANYONE EXTENDING THIS: `state.you.reading` is deliberately absent
 * and must stay absent. It is the visitor's skin and hair colour. Adding it
 * would make every shared link publish that to whoever receives it.
 */
export function encodeState(state: AppState): string {
  const q = new URLSearchParams()

  if (state.granularity !== initialState.granularity) q.set('g', String(state.granularity))
  if (!sameSizes(state.sizes, initialState.sizes)) q.set('sizes', state.sizes.join(','))
  if (state.selection) q.set('open', encodeSelection(state.selection))
  if (state.browse.family) q.set('family', state.browse.family)
  if (state.browse.shade) q.set('shade', state.browse.shade)
  if (state.browse.colorId) q.set('color', state.browse.colorId)
  if (state.palette.level !== initialState.palette.level) q.set('level', String(state.palette.level))
  if (state.palette.keys.length) q.set('keys', state.palette.keys.join(','))
  if (state.access.length) q.set('lens', state.access.join(','))
  if (state.you.season) q.set('season', state.you.season)
  if (state.you.floor !== initialState.you.floor) q.set('floor', String(state.you.floor))
  if (state.aboutOpen) q.set('about', '1')

  // URLSearchParams percent-encodes `:` and `,`, turning
  // `open=combination:1&sizes=2,3` into `open=combination%3A1&sizes=2%2C3`.
  // Both characters are legal unencoded in a query string (RFC 3986 puts them
  // in `pchar` via sub-delims), and the whole argument for this format over an
  // encoded blob is that a person can read the link they are pasting. Put them
  // back. Found by looking at a real address bar — the round-trip tests were
  // perfectly happy either way, because decoding is symmetric.
  const query = q.toString().replace(/%3A/g, ':').replace(/%2C/g, ',')
  const view = state.view === initialState.view ? '' : state.view
  if (!view && !query) return ''
  return `#/${view}${query ? `?${query}` : ''}`
}

// --- decoding: everything below treats its input as hostile ---

function int(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined
  // Number() rather than parseInt: parseInt('12abc') is 12, which would accept
  // a corrupted id as a valid one.
  const n = Number(raw)
  return Number.isInteger(n) ? n : undefined
}

function oneOf<T>(raw: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(raw as T) ? (raw as T) : undefined
}

function numberIn<T extends number>(raw: string | null, allowed: readonly T[]): T | undefined {
  const n = int(raw)
  return n !== undefined && allowed.includes(n as T) ? (n as T) : undefined
}

function decodeSizes(raw: string | null): SizeBucket[] | undefined {
  if (!raw) return undefined
  const parsed = raw.split(',')
    .map((s) => int(s))
    .filter((n): n is SizeBucket => n !== undefined && SIZES.includes(n as SizeBucket))
  const unique = [...new Set(parsed)].sort((a, b) => a - b)
  // An empty result would render nothing at all, which no link should be able
  // to ask for. Fall back to the default by omitting the key.
  return unique.length ? unique : undefined
}

function decodeSelection(raw: string | null): Selection | undefined {
  if (!raw) return undefined
  const parts = raw.split(':')
  const kind = oneOf(parts[0] ?? null, SELECTION_KINDS)
  if (!kind) return undefined

  if (kind === 'color' || kind === 'combination') {
    const id = int(parts[1] ?? null)
    // Whether the id EXISTS is not knowable here — the kernel cannot see the
    // dataset. src/urlSync.ts checks, and the detail panels show
    // MissingPanel for one that slips through.
    return id === undefined ? undefined : { kind, id }
  }
  if (kind === 'group') {
    return parts[1] ? { kind, id: parts[1] } : undefined
  }
  const level = numberIn<GranularityLevel>(parts[1] ?? null, [0, 1, 2, 3])
  const [, , keyA, keyB, sizes] = parts
  if (level === undefined || !keyA || !keyB) return undefined
  const ribbonSizes = sizes ? decodeSizes(sizes.replace(/\./g, ',')) : undefined
  return ribbonSizes
    ? { kind, level, keyA, keyB, sizes: ribbonSizes }
    : { kind, level, keyA, keyB }
}

function decodeKeys(raw: string | null): string[] | undefined {
  if (!raw) return undefined
  const keys = [...new Set(raw.split(',').map((k) => k.trim()).filter(Boolean))]
  return keys.length ? keys : undefined
}

function decodeLenses(raw: string | null): AccessLensId[] | undefined {
  if (!raw) return undefined
  const lenses = [...new Set(raw.split(',')
    .map((l) => oneOf(l, LENSES))
    .filter((l): l is AccessLensId => l !== undefined))]
  return lenses.length ? lenses : undefined
}

/**
 * A hash as whatever parts of the state it validly describes.
 *
 * Returns a PARTIAL on purpose: keys it could not make sense of are absent, so
 * `{ ...initialState, ...decodeState(hash) }` is always a renderable state.
 * Never throws, whatever it is handed.
 */
export function decodeState(hash: string): Partial<AppState> {
  const out: Partial<AppState> = {}
  if (!hash || hash.length > MAX_HASH) return out

  // `#/browse?family=reds` -> path `browse`, query `family=reds`
  const body = hash.replace(/^#\/?/, '')
  const qAt = body.indexOf('?')
  const path = (qAt === -1 ? body : body.slice(0, qAt)).replace(/\/+$/, '')
  const q = new URLSearchParams(qAt === -1 ? '' : body.slice(qAt + 1))

  const view = oneOf(path, VIEWS)
  if (view) out.view = view

  const g = numberIn<GranularityLevel>(q.get('g'), [0, 1, 2, 3])
  if (g !== undefined) out.granularity = g

  const sizes = decodeSizes(q.get('sizes'))
  if (sizes) out.sizes = sizes

  const selection = decodeSelection(q.get('open'))
  if (selection) out.selection = selection

  const family = q.get('family') ?? ''
  const shade = q.get('shade') ?? ''
  const colorId = q.get('color') ?? ''
  // `palette` is deliberately absent, and `encodeState` never writes one.
  //
  // A Browse palette can be the visitor's MEASURED colours, worked out from a
  // photograph of their face. Nineteen colour ids are a weaker version of the
  // leak the owner ruled out for the reading itself, and the conservative
  // reading of that decision is not to widen it here. A palette therefore lives
  // for the session and is not shareable, exactly as the reading is not.
  //
  // Consequence, accepted: a link to a palette-filtered Browse restores the
  // dropdown filters and drops the palette, rather than half-restoring it.
  if (family || shade || colorId) out.browse = { family, shade, colorId, palette: null }

  const level = numberIn<MatchLevel>(q.get('level'), [0, 1, 2])
  const keys = decodeKeys(q.get('keys'))
  if (level !== undefined || keys) {
    out.palette = {
      level: level ?? initialState.palette.level,
      keys: keys ?? [],
    }
  }

  const lenses = decodeLenses(q.get('lens'))
  if (lenses) out.access = lenses

  const season = q.get('season')?.trim()
  const floor = numberIn<FloorStop>(q.get('floor'), [0, 1, 2, 3])
  if (season || floor !== undefined) {
    out.you = {
      // Always null. A link cannot carry a reading, by design — see the header.
      reading: null,
      season: season || null,
      floor: floor ?? initialState.you.floor,
    }
  }

  if (q.get('about') === '1') out.aboutOpen = true

  return out
}
