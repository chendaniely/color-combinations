// Serialising the one app-state object into a URL, and back.
//
// All the interesting logic of deep links lives in this pure pair, which is why
// it can be tested without a browser at all. src/urlSync.ts owns `location`,
// `history` and the dataset lookups; this owns the strings.
//
// The properties that matter are round-tripping and defensiveness. A URL is
// the one input to this site that arrives from outside — someone else's chat
// window, a truncated link, a hand-edited address — so `decodeState` must treat
// everything as hostile and never produce a value the app cannot render.
import { describe, expect, it } from 'vitest'
import { decodeState, encodeState } from '../src/core/urlState'
import { initialState, type AppState, type Selection } from '../src/core/state'
import type { SkinReading } from '../src/core/types'

/** Encode, decode, merge — what actually happens when a link is opened. */
function roundTrip(state: AppState): AppState {
  return { ...initialState, ...decodeState(encodeState(state)) }
}

const READING: SkinReading = {
  skin: '#a1673f', hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: 49.4, skinHue: 57.1, ita: -1, contrastGap: 43.5, whiteBalanced: true,
}

describe('the default state has no URL at all', () => {
  it('encodes to an empty string, not "#" or "#/"', () => {
    // The front page should keep the address it has always had, and a trailing
    // "#" in a pasted link looks like a mistake.
    expect(encodeState(initialState)).toBe('')
  })

  it('round-trips to itself', () => {
    expect(roundTrip(initialState)).toEqual(initialState)
  })

  it('decodes an empty hash to no opinions at all', () => {
    expect(decodeState('')).toEqual({})
    expect(decodeState('#')).toEqual({})
    expect(decodeState('#/')).toEqual({})
  })
})

describe('every part of the state round-trips', () => {
  it('the view', () => {
    for (const view of ['browse', 'match', 'you'] as const) {
      expect(roundTrip({ ...initialState, view }).view).toBe(view)
    }
  })

  it('granularity', () => {
    for (const granularity of [1, 2, 3] as const) {
      expect(roundTrip({ ...initialState, granularity }).granularity).toBe(granularity)
    }
  })

  it('the size filter', () => {
    expect(roundTrip({ ...initialState, sizes: [2] }).sizes).toEqual([2])
    expect(roundTrip({ ...initialState, sizes: [3, 4] }).sizes).toEqual([3, 4])
  })

  it('all four kinds of selection', () => {
    const selections: Selection[] = [
      { kind: 'color', id: 42 },
      { kind: 'combination', id: 331 },
      { kind: 'group', id: 'deep-blues' },
      { kind: 'ribbon', level: 1, keyA: 'olives', keyB: 'deep-teals' },
      { kind: 'ribbon', level: 2, keyA: 'reds', keyB: 'reds', sizes: [2, 3] },
    ]
    for (const selection of selections) {
      expect(roundTrip({ ...initialState, selection }).selection, JSON.stringify(selection))
        .toEqual(selection)
    }
  })

  it('the browse filters', () => {
    const browse = { family: 'reds', shade: 'olives', colorId: '42' }
    expect(roundTrip({ ...initialState, browse }).browse).toEqual(browse)
  })

  it('the match palette', () => {
    const palette = { level: 2 as const, keys: ['olives', 'deep-teals'] }
    expect(roundTrip({ ...initialState, palette }).palette).toEqual(palette)
  })

  it('the accessibility lenses', () => {
    const access = ['web-text', 'colorblind'] as const
    expect(roundTrip({ ...initialState, access: [...access] }).access).toEqual([...access])
  })

  it('the season and the floor', () => {
    const you = { reading: null, season: 'deep-autumn', floor: 3 as const }
    expect(roundTrip({ ...initialState, you }).you).toEqual(you)
  })

  it('the about panel', () => {
    expect(roundTrip({ ...initialState, aboutOpen: true }).aboutOpen).toBe(true)
  })

  it('several things at once', () => {
    const state: AppState = {
      ...initialState,
      view: 'browse',
      granularity: 2,
      sizes: [2, 3],
      selection: { kind: 'color', id: 7 },
      browse: { family: 'reds', shade: '', colorId: '' },
      access: ['print-bw'],
      you: { reading: null, season: 'cool-summer', floor: 0 },
    }
    expect(roundTrip(state)).toEqual(state)
  })
})

describe('defaults are left out of the string', () => {
  it('omits granularity 0, all sizes, match level 1 and floor 2', () => {
    const encoded = encodeState({ ...initialState, view: 'browse' })
    expect(encoded).not.toContain('g=')
    expect(encoded).not.toContain('sizes=')
    expect(encoded).not.toContain('level=')
    expect(encoded).not.toContain('floor=')
  })

  it('keeps a shared link short enough to read', () => {
    const encoded = encodeState({
      ...initialState, view: 'you', you: { reading: null, season: 'deep-autumn', floor: 2 },
    })
    expect(encoded).toBe('#/you?season=deep-autumn')
  })
})

// A URL is the one input to this site that comes from outside it. Everything
// here is a real thing a link can contain: truncated, hand-edited, from an
// older version of the site, or simply wrong.
describe('a hostile or stale hash never produces an unusable state', () => {
  const hostile = [
    '#/nonsense',
    '#/browse?g=99',
    '#/browse?g=-1',
    '#/browse?g=abc',
    '#/wheel?sizes=9',
    '#/wheel?sizes=',
    '#/wheel?sizes=2,2,2',
    '#/wheel?open=color:abc',
    '#/wheel?open=color:',
    '#/wheel?open=nonsense:1',
    '#/wheel?open=ribbon:9:a:b',
    '#/wheel?open=',
    '#/match?level=7',
    '#/match?keys=',
    '#/you?floor=9',
    '#/you?season=',
    '#/browse?lens=not-a-lens',
    '#/?about=maybe',
    '#/////',
    '#/browse?family=%00',
    '#' + 'x'.repeat(5000),
  ]

  it('never throws', () => {
    for (const hash of hostile) {
      expect(() => decodeState(hash), hash).not.toThrow()
    }
  })

  it('produces a state the app can render', () => {
    for (const hash of hostile) {
      const merged = { ...initialState, ...decodeState(hash) }
      expect(['wheel', 'browse', 'match', 'you'], hash).toContain(merged.view)
      expect([0, 1, 2, 3], hash).toContain(merged.granularity)
      expect(merged.sizes.length, `${hash} left no sizes, which shows nothing`)
        .toBeGreaterThan(0)
      for (const s of merged.sizes) expect([2, 3, 4], hash).toContain(s)
      expect([0, 1, 2], hash).toContain(merged.palette.level)
      expect([0, 1, 2, 3], hash).toContain(merged.you.floor)
      for (const a of merged.access) {
        expect(['web-text', 'print-bw', 'colorblind'], hash).toContain(a)
      }
      if (merged.selection) {
        expect(['color', 'combination', 'group', 'ribbon'], hash)
          .toContain(merged.selection.kind)
        if (merged.selection.kind === 'color' || merged.selection.kind === 'combination') {
          expect(Number.isInteger(merged.selection.id), hash).toBe(true)
        }
      }
    }
  })

  it('drops an unknown view rather than inventing one', () => {
    expect(decodeState('#/nonsense').view).toBeUndefined()
  })

  it('ignores an out-of-range granularity instead of clamping it silently', () => {
    // Clamping 99 to 3 would show a screen the link never asked for. Omitting
    // it falls back to the default, which is the honest reading of nonsense.
    expect(decodeState('#/browse?g=99').granularity).toBeUndefined()
  })
})

// Guards the owner's privacy decision at the round-trip level; the dedicated
// assertions live in tests/urlPrivacy.test.ts.
describe('a reading does not survive a round trip', () => {
  it('comes back null even when it went in populated', () => {
    const state: AppState = {
      ...initialState, view: 'you',
      you: { reading: READING, season: 'deep-autumn', floor: 2 },
    }
    const back = roundTrip(state)
    expect(back.you.reading).toBeNull()
    expect(back.you.season).toBe('deep-autumn')
  })
})
