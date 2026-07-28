import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../src/core/state'
import type { SkinReading } from '../src/core/types'

describe('app state reducer', () => {
  it('starts on the wheel at color granularity with all sizes on', () => {
    expect(initialState).toEqual({
      view: 'wheel', granularity: 0, sizes: [2, 3, 4], selection: null, aboutOpen: false,
      palette: { level: 1, keys: [] },
      browse: { family: '', shade: '', colorId: '' },
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
  it('initial state carries empty browse filters', () => {
    expect(initialState.browse).toEqual({ family: '', shade: '', colorId: '' })
  })
  it('seedPalette works at the color level', () => {
    const s = reducer(initialState, { type: 'seedPalette', key: 'c12', level: 0 })
    expect(s.view).toBe('match')
    expect(s.palette).toEqual({ level: 0, keys: ['c12'] })
  })
  it('setBrowseFilter replaces the browse filter object', () => {
    const s = reducer(initialState, { type: 'setBrowseFilter', browse: { family: 'green', shade: '', colorId: '' } })
    expect(s.browse).toEqual({ family: 'green', shade: '', colorId: '' })
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
