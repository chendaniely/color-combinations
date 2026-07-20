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
