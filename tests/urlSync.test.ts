// @vitest-environment jsdom
// The browser half of deep linking: sanitising against the book, and seeding
// the first render from the address bar.
//
// The push-versus-replace behaviour and the Back button are asserted in a real
// browser (tests/browser/deepLinks.spec.ts) — jsdom has a history object but no
// actual navigation, so a Back test here would be testing the polyfill.
import { describe, expect, it } from 'vitest'
import { initialStateFromUrl, sanitise } from '../src/urlSync'
import { initialState } from '../src/core/state'
import { dataset } from '../src/data'

const realColor = dataset.data.colors[0]
const realBroad = dataset.data.groups.broad[0]
const realFine = dataset.data.groups.fine[0]

function withHash(hash: string) {
  location.hash = hash
  return initialStateFromUrl()
}

describe('sanitising drops what the book has not got', () => {
  it('drops an unknown palette key and keeps the real ones', () => {
    const out = sanitise({ palette: { level: 1, keys: [realBroad.id, 'not-a-shade'] } })
    expect(out.palette!.keys).toEqual([realBroad.id])
  })

  it('keeps a colour key that resolves', () => {
    const out = sanitise({ palette: { level: 1, keys: [`c${realColor.id}`, 'c999999'] } })
    expect(out.palette!.keys).toEqual([`c${realColor.id}`])
  })

  it('drops browse filters the book has not got', () => {
    const out = sanitise({ browse: { family: 'nope', shade: realFine.id, colorId: '999999', palette: null } })
    expect(out.browse).toEqual({ family: '', shade: realFine.id, colorId: '', palette: null })
  })

  it('omits the browse block entirely when nothing in it survives', () => {
    const out = sanitise({ browse: { family: 'nope', shade: 'nope', colorId: '999999', palette: null } })
    expect(out.browse).toBeUndefined()
  })

  // The deliberate asymmetry. A stale FILTER should quietly stop applying; a
  // stale SELECTION is the subject of the link and must explain itself, which
  // MissingPanel does. Silently dropping it would land the reader on a page
  // with no account of what they were sent.
  it('leaves an unknown selection alone, so the panel can explain it', () => {
    const out = sanitise({ selection: { kind: 'color', id: 999999 } })
    expect(out.selection).toEqual({ kind: 'color', id: 999999 })
  })
})

describe('the first render comes from the address bar', () => {
  it('uses the defaults when there is no hash', () => {
    expect(withHash('')).toEqual(initialState)
  })

  it('restores a view', () => {
    expect(withHash('#/browse').view).toBe('browse')
  })

  it('restores filters, sanitised', () => {
    const state = withHash(`#/browse?family=${realBroad.id}&shade=nope`)
    expect(state.browse.family).toBe(realBroad.id)
    expect(state.browse.shade).toBe('')
  })

  it('restores an open panel', () => {
    const state = withHash(`#/wheel?open=color:${realColor.id}`)
    expect(state.selection).toEqual({ kind: 'color', id: realColor.id })
  })

  it('restores a season without a reading', () => {
    const state = withHash('#/you?season=deep-autumn')
    expect(state.view).toBe('you')
    expect(state.you.season).toBe('deep-autumn')
    // The whole point of the privacy decision: a link cannot bring one.
    expect(state.you.reading).toBeNull()
  })

  // The crash this feature would otherwise have caused. `keyName` throws on an
  // unknown key, and PaletteTray renders every palette key — so before
  // sanitising, `#/match?keys=not-a-shade` took the whole app down.
  it('produces a Match state with no unknown keys in it', () => {
    const state = withHash('#/match?keys=not-a-shade,also-not-real')
    expect(state.view).toBe('match')
    expect(state.palette.keys).toEqual([])
  })

  it('survives a hash that is pure nonsense', () => {
    expect(() => withHash('#/nonsense?g=99&open=color:abc&keys=,,,')).not.toThrow()
    const state = withHash('#/nonsense?g=99&open=color:abc&keys=,,,')
    expect(state.view).toBe('wheel')
    expect(state.granularity).toBe(0)
    expect(state.selection).toBeNull()
  })
})
