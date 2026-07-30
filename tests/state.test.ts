import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../src/core/state'
import type { SkinReading } from '../src/core/types'

describe('app state reducer', () => {
  it('starts on the wheel at color granularity with all sizes on', () => {
    expect(initialState).toEqual({
      view: 'wheel', granularity: 0, sizes: [2, 3, 4], selection: null, aboutOpen: false,
      palette: { level: 1, keys: [] },
      browse: { family: '', shade: '', colorId: '', palette: null },
      access: [],
      you: { reading: null, season: null, floor: 2 },
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
  it('starts with an empty shades palette', () => {
    expect(initialState.palette).toEqual({ level: 1, keys: [] })
  })
  it('seedPalette sets one key, enters match, closes panels', () => {
    const s = reducer(
      { ...initialState, selection: { kind: 'color', id: 1 }, aboutOpen: true },
      { type: 'seedPalette', key: 'olives', level: 1 })
    expect(s.view).toBe('match')
    expect(s.palette).toEqual({ level: 1, keys: ['olives'] })
    expect(s.selection).toBeNull()
    expect(s.aboutOpen).toBe(false)
  })
  it('addToPalette appends and dedupes', () => {
    let s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    s = reducer(s, { type: 'addToPalette', key: 'deep-teals' })
    s = reducer(s, { type: 'addToPalette', key: 'olives' }) // dup no-op
    expect(s.palette.keys).toEqual(['olives', 'deep-teals'])
  })
  it('removeFromPalette drops a key', () => {
    let s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    s = reducer(s, { type: 'addToPalette', key: 'deep-teals' })
    s = reducer(s, { type: 'removeFromPalette', key: 'olives' })
    expect(s.palette.keys).toEqual(['deep-teals'])
  })
  it('setMatchLevel replaces level and keys (mapping done by caller)', () => {
    let s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    s = reducer(s, { type: 'setMatchLevel', level: 2, keys: ['green'] })
    expect(s.palette).toEqual({ level: 2, keys: ['green'] })
  })
  it('clearPalette empties keys but keeps level and match view', () => {
    let s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    s = reducer(s, { type: 'clearPalette' })
    expect(s.palette).toEqual({ level: 1, keys: [] })
    expect(s.view).toBe('match')
  })
  it('palette state stays JSON-serializable', () => {
    const s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })
  it('initial state carries empty browse filters and no palette', () => {
    expect(initialState.browse).toEqual({ family: '', shade: '', colorId: '', palette: null })
  })
  it('seedPalette works at the color level', () => {
    const s = reducer(initialState, { type: 'seedPalette', key: 'c12', level: 0 })
    expect(s.view).toBe('match')
    expect(s.palette).toEqual({ level: 0, keys: ['c12'] })
  })
  // MERGES rather than replaces, changed in v1.8.2. It used to replace the whole
  // object, which would silently drop a palette carried in from the You tab the
  // moment the visitor touched a dropdown — and dropping the thing they came to
  // look at is worse than any tidiness the replacement bought.
  it('setBrowseFilter merges, so a palette survives a dropdown change', () => {
    const s = reducer(initialState, { type: 'setBrowseFilter', browse: { family: 'green', shade: '', colorId: '' } })
    expect(s.browse).toEqual({ family: 'green', shade: '', colorId: '', palette: null })
  })
  it('toggleAccess adds and removes lenses; empty is allowed', () => {
    let s = reducer(initialState, { type: 'toggleAccess', id: 'web-text' })
    expect(s.access).toEqual(['web-text'])
    s = reducer(s, { type: 'toggleAccess', id: 'colorblind' })
    expect(s.access).toEqual(['web-text', 'colorblind'])
    s = reducer(s, { type: 'toggleAccess', id: 'web-text' })
    expect(s.access).toEqual(['colorblind'])
    s = reducer(s, { type: 'toggleAccess', id: 'colorblind' })
    expect(s.access).toEqual([]) // unlike sizes, empty IS allowed (= no filter)
    expect(JSON.parse(JSON.stringify(s))).toEqual(s) // stays serializable
  })
})

describe('the You tab', () => {
  const reading: SkinReading = {
    skin: '#a1673f', hair: '#1a1110',
    undertone: 'warm', depth: 'deep', contrast: 'high',
    skinL: 50.2, skinHue: 58.1, ita: 0.4, contrastGap: 40.6,
    whiteBalanced: true,
  }

  it('starts with no reading and the default floor', () => {
    expect(initialState.you.reading).toBeNull()
    expect(initialState.you.season).toBeNull()
    expect(initialState.you.floor).toBe(2)      // "half or more"
  })

  it('stores a reading', () => {
    const s = reducer(initialState, { type: 'setReading', reading })
    expect(s.you.reading).toEqual(reading)
  })

  it('a new reading clears any season override', () => {
    const withSeason = reducer(
      reducer(initialState, { type: 'setReading', reading }),
      { type: 'setSeason', season: 'soft-summer' })
    expect(withSeason.you.season).toBe('soft-summer')
    const reread = reducer(withSeason, { type: 'setReading', reading })
    expect(reread.you.season).toBeNull()
  })

  it('clearReading resets the whole slice', () => {
    const s = reducer(reducer(initialState, { type: 'setReading', reading }),
                      { type: 'clearReading' })
    expect(s.you).toEqual(initialState.you)
  })

  it('setFloor changes only the floor', () => {
    const s = reducer(initialState, { type: 'setFloor', floor: 0 })
    expect(s.you.floor).toBe(0)
    expect(s.you.reading).toBeNull()
  })

  it('never holds image data', () => {
    const s = reducer(initialState, { type: 'setReading', reading })
    // The whole state must round-trip through JSON — no canvas, no blob, no File.
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })
})

// A palette carried in from the You tab. Reported by the owner: "Browse ... the
// list of colors that lets the user explore is only 1 color", because Browse
// could filter to one colour and the doorway handed it one of nineteen.
describe('the Browse palette filter', () => {
  const PALETTE = { ids: [1, 2, 3], label: 'Your colours', floor: 2 as const }

  it('setting one navigates to Browse, the way seedPalette navigates to Match', () => {
    const s = reducer(initialState, { type: 'setBrowsePalette', palette: PALETTE })
    expect(s.view).toBe('browse')
    expect(s.browse.palette).toEqual(PALETTE)
  })

  it('closes any open panel on the way, so the handoff is visible', () => {
    const open = reducer(initialState, { type: 'select', selection: { kind: 'color', id: 1 } })
    const s = reducer(open, { type: 'setBrowsePalette', palette: PALETTE })
    expect(s.selection).toBeNull()
  })

  it('clearing it does NOT navigate — the visitor is already on Browse', () => {
    const withPalette = reducer(initialState, { type: 'setBrowsePalette', palette: PALETTE })
    const onWheel = { ...withPalette, view: 'wheel' as const }
    expect(reducer(onWheel, { type: 'setBrowsePalette', palette: null }).view).toBe('wheel')
  })

  it('survives a dropdown change', () => {
    const withPalette = reducer(initialState, { type: 'setBrowsePalette', palette: PALETTE })
    const filtered = reducer(withPalette, {
      type: 'setBrowseFilter', browse: { family: 'green', shade: '', colorId: '' },
    })
    expect(filtered.browse.palette, 'the palette was dropped by a dropdown').toEqual(PALETTE)
    expect(filtered.browse.family).toBe('green')
  })

  it('changes the floor without losing the colours', () => {
    const withPalette = reducer(initialState, { type: 'setBrowsePalette', palette: PALETTE })
    const stricter = reducer(withPalette, {
      type: 'setBrowsePalette', palette: { ...PALETTE, floor: 0 },
    })
    expect(stricter.browse.palette!.floor).toBe(0)
    expect(stricter.browse.palette!.ids).toEqual(PALETTE.ids)
  })
})
